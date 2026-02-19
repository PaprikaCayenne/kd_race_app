// File: api/sockets/race.ts
// Version: v3.0.0 — Canonical session/order/replay broadcasts from server runtime
// Date: 2026-02-18

import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { raceHorseCache } from '../routes/admin.js';
import { buildCanonicalRaceSummary } from '../lib/raceSummary.js';
import { horseSpriteDataUri } from '../lib/horseSprite.js';
import {
  bootstrapRaceSession,
  clearReplaySession,
  getRaceSession,
  startReplaySession,
  stopReplaySession,
  updateRaceSession
} from '../lib/raceSession.js';

const prisma = new PrismaClient();
export let raceNamespace: ReturnType<Server['of']>;

interface ReplayTickHorse {
  horseId: number;
  name: string;
  bodyHex: string;
  saddleHex: string;
  pct: number;
}

interface ReplayRuntimeState {
  raceId: string;
  running: boolean;
  paused: boolean;
  timer: NodeJS.Timeout | null;
  startedAtMs: number;
  cursor: number;
  timeline: Array<{ timeMs: number; frames: ReplayTickHorse[] }>;
  latestByHorse: Map<number, ReplayTickHorse>;
}

let replayRuntime: ReplayRuntimeState | null = null;
const raceRuntimeSockets = new Set<string>();

function normalizeAndSortRanking(ranking: any[]): any[] {
  return [...ranking]
    .map((entry) => ({
      ...entry,
      normalizedProgress: Number(entry.normalizedProgress ?? entry.pct ?? 0)
    }))
    .sort((a, b) => {
      if (b.normalizedProgress !== a.normalizedProgress) {
        return b.normalizedProgress - a.normalizedProgress;
      }
      return (b.id || 0) - (a.id || 0);
    })
    .map((entry, idx) => ({ ...entry, position: idx + 1 }));
}

function stopReplayRuntime() {
  if (replayRuntime?.timer) {
    clearInterval(replayRuntime.timer);
  }
  replayRuntime = null;
}

async function buildReplayTimeline(raceId: bigint): Promise<Array<{ timeMs: number; frames: ReplayTickHorse[] }>> {
  const [frames, horses] = await Promise.all([
    prisma.replayFrame.findMany({
      where: { raceId },
      orderBy: [{ timeMs: 'asc' }],
      select: { timeMs: true, horseId: true, pct: true }
    }),
    prisma.horsePath.findMany({
      where: { raceId },
      orderBy: { index: 'asc' },
      select: {
        horse: {
          select: {
            id: true,
            name: true,
            bodyHex: true,
            saddleHex: true
          }
        }
      }
    })
  ]);

  const horseById = new Map(horses.map((hp) => [hp.horse.id, hp.horse]));
  const grouped = new Map<number, ReplayTickHorse[]>();

  frames.forEach((frame) => {
    const horse = horseById.get(frame.horseId);
    if (!horse) return;

    const bucket = grouped.get(frame.timeMs) || [];
    bucket.push({
      horseId: horse.id,
      name: horse.name,
      bodyHex: horse.bodyHex,
      saddleHex: horse.saddleHex,
      pct: Math.max(0, Math.min(1, Number(frame.pct) || 0))
    });
    grouped.set(frame.timeMs, bucket);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timeMs, framesAtTime]) => ({ timeMs, frames: framesAtTime }));
}

function emitSessionUpdate(origin = 'server') {
  if (!raceNamespace) return;
  raceNamespace.emit('session:update', { session: getRaceSession(), origin });
}

export async function patchSessionAndBroadcast(
  patch: Parameters<typeof updateRaceSession>[0],
  origin = 'server'
) {
  const current = getRaceSession();
  const isReplayControlPatch = (
    patch.state === 'replaying'
    || Object.prototype.hasOwnProperty.call(patch, 'selectedReplayRaceId')
    || Object.prototype.hasOwnProperty.call(patch, 'replayPaused')
  );

  let effectivePatch = patch;

  if (current.state === 'replaying' && !isReplayControlPatch) {
    const livePatch: Parameters<typeof updateRaceSession>[0] = {};

    if (Object.prototype.hasOwnProperty.call(patch, 'activeRaceId')) {
      livePatch.activeRaceId = patch.activeRaceId;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'tournamentId')) {
      livePatch.tournamentId = patch.tournamentId;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'heatNumber')) {
      livePatch.heatNumber = patch.heatNumber;
    }
    if (patch.state && patch.state !== 'replaying') {
      livePatch.liveStateBeforeReplay = patch.state;
    }

    effectivePatch = livePatch;
  }

  if (Object.keys(effectivePatch).length === 0) {
    emitSessionUpdate(origin);
    return;
  }

  await updateRaceSession(effectivePatch);
  emitSessionUpdate(origin);
}

export async function beginReplayAndBroadcast(raceId: string, origin = 'admin') {
  await startReplaySession(raceId);
  emitSessionUpdate(origin);
  await startReplayRuntime(raceId);
}

export async function stopReplayAndBroadcast(origin = 'admin') {
  if (replayRuntime) {
    replayRuntime.paused = true;
    replayRuntime.running = false;
    if (replayRuntime.timer) clearInterval(replayRuntime.timer);
    replayRuntime.timer = null;
  }
  await stopReplaySession();
  emitSessionUpdate(origin);
}

export async function clearReplayAndBroadcast(origin = 'admin') {
  stopReplayRuntime();
  await clearReplaySession();
  emitSessionUpdate(origin);
  raceNamespace?.emit('replay:cleared');
}

async function startReplayRuntime(raceId: string) {
  stopReplayRuntime();

  const numericRaceId = BigInt(raceId);
  const timeline = await buildReplayTimeline(numericRaceId);
  if (timeline.length === 0) {
    raceNamespace?.emit('replay:empty', { raceId });
    return;
  }

  replayRuntime = {
    raceId,
    running: true,
    paused: false,
    timer: null,
    startedAtMs: Date.now(),
    cursor: 0,
    timeline,
    latestByHorse: new Map()
  };

  raceNamespace?.emit('replay:started', { raceId });

  replayRuntime.timer = setInterval(() => {
    if (!replayRuntime || replayRuntime.paused || !replayRuntime.running) return;

    const elapsed = Date.now() - replayRuntime.startedAtMs;

    while (
      replayRuntime.cursor < replayRuntime.timeline.length
      && replayRuntime.timeline[replayRuntime.cursor].timeMs <= elapsed
    ) {
      const entry = replayRuntime.timeline[replayRuntime.cursor];
      entry.frames.forEach((frame) => replayRuntime?.latestByHorse.set(frame.horseId, frame));
      replayRuntime.cursor += 1;
    }

    const ranking = normalizeAndSortRanking(
      Array.from(replayRuntime.latestByHorse.values()).map((horse) => ({
        id: horse.horseId,
        horseId: horse.horseId,
        name: horse.name,
        bodyHex: horse.bodyHex,
        saddleHex: horse.saddleHex,
        normalizedProgress: horse.pct,
        pct: horse.pct
      }))
    );

    raceNamespace?.emit('replay:tick', {
      raceId,
      elapsedMs: elapsed,
      ranking
    });

    if (replayRuntime.cursor >= replayRuntime.timeline.length) {
      replayRuntime.running = false;
      if (replayRuntime.timer) clearInterval(replayRuntime.timer);
      replayRuntime.timer = null;
      raceNamespace?.emit('replay:finished', { raceId });
    }
  }, 100);
}

async function emitWinnerPreview(raceId: string, horseId: number, localId: number | null) {
  let resolvedHorseId = horseId;

  if (!Number.isInteger(resolvedHorseId) && localId != null) {
    const cached = raceHorseCache.get(Number(raceId)) || [];
    const match = cached.find((h) => h.localId === localId);
    resolvedHorseId = Number(match?.id || match?.horseId);
  }

  if (!Number.isInteger(resolvedHorseId)) return;

  const horse = await prisma.horse.findUnique({
    where: { id: resolvedHorseId },
    select: { name: true, bodyHex: true, saddleHex: true }
  });
  if (!horse) return;

  const betsOnHorse = await prisma.bet.findMany({
    where: { raceId: BigInt(raceId), horseId: resolvedHorseId },
    orderBy: { amount: 'desc' },
    select: {
      amount: true,
      user: { select: { nickname: true, firstName: true, lastName: true } }
    }
  });

  const top = betsOnHorse[0] || null;
  const bettorName = top
    ? top.user.nickname || [top.user.firstName, top.user.lastName].filter(Boolean).join(' ') || 'Unknown bettor'
    : 'No bets placed';

  raceNamespace?.emit('winner:preview', {
    winner: {
      raceId,
      bettorName,
      winnings: top ? top.amount * 3 : 0,
      horseName: horse.name,
      horseImage: horseSpriteDataUri(horse.bodyHex, horse.saddleHex),
      bodyHex: horse.bodyHex,
      saddleHex: horse.saddleHex
    }
  });
}

export function setupRaceNamespace(io: Server): void {
  raceNamespace = io.of('/race');

  bootstrapRaceSession()
    .then(() => emitSessionUpdate('bootstrap'))
    .catch((err) => console.error('❌ [Session] bootstrap failed:', err));

  raceNamespace.on('connection', (socket: Socket) => {
    console.log('✅ [WS] Client connected to /race:', socket.id);
    socket.emit('session:init', { session: getRaceSession() });

    socket.on('race:screen:ready', () => {
      raceRuntimeSockets.add(socket.id);
    });

    socket.on('session:request-init', () => {
      socket.emit('session:init', { session: getRaceSession() });
    });

    socket.on('race:order', (payload) => {
      if (!raceRuntimeSockets.has(socket.id)) return;
      const session = getRaceSession();
      if (session.state === 'replaying') return;
      if (session.activeRaceId && String(payload?.raceId) !== String(session.activeRaceId)) return;

      const ranking = Array.isArray(payload?.ranking) ? payload.ranking : [];
      const canonical = normalizeAndSortRanking(ranking);
      raceNamespace.emit('race:order', {
        raceId: payload?.raceId,
        elapsedMs: payload?.elapsedMs,
        ranking: canonical
      });
    });

    socket.on('race:first-finish', async ({ raceId, horseId, localId }) => {
      try {
        await emitWinnerPreview(String(raceId), Number(horseId), Number.isInteger(Number(localId)) ? Number(localId) : null);
      } catch (err) {
        console.error('❌ [winner:preview] failed:', err);
      }
    });

    socket.on('startRace', handleStartRace);
    socket.on('admin:start-race', (payload) => handleStartRace(payload));

    socket.on('admin:open-bets', async () => {
      await patchSessionAndBroadcast({ state: 'betting_open' }, 'admin');
      raceNamespace.emit('admin:open-bets');
    });

    socket.on('admin:close-bets', async () => {
      await patchSessionAndBroadcast({ state: 'betting_closed' }, 'admin');
      raceNamespace.emit('admin:close-bets');
    });

    socket.on('admin:replay-start', async ({ raceId }) => {
      if (!raceId) return;
      await beginReplayAndBroadcast(String(raceId), 'admin');
    });

    socket.on('admin:replay-stop', async () => {
      await stopReplayAndBroadcast('admin');
    });

    socket.on('admin:replay-clear', async () => {
      await clearReplayAndBroadcast('admin');
    });

    socket.on('race:setup-failed', async ({ raceId, reason }: { raceId: string; reason: string }) => {
      try {
        await prisma.race.delete({ where: { id: BigInt(raceId) } });
      } catch (err) {
        console.error('❌ [DB] Failed to delete invalid race:', err);
      }
      await patchSessionAndBroadcast({ state: 'cleared' }, 'race');
      raceNamespace.emit('race:setup-aborted', { raceId, reason });
    });

    socket.on('race:finish', async ({ raceId, leaderboard, results, replayFrames = [] }) => {
      if (!raceRuntimeSockets.has(socket.id)) return;
      try {
        const normalized = Array.isArray(results) && results.length > 0
          ? results
          : (Array.isArray(leaderboard) ? leaderboard.map((row: any, index: number) => ({
              horseId: row.horseId,
              localId: row.localId,
              position: row.position ?? index + 1,
              timeMs: row.timeMs
            })) : []);

        const { saved, resultHorseIds } = await saveRaceResults(BigInt(raceId), normalized);
        if (saved && Array.isArray(replayFrames) && replayFrames.length > 0) {
          await saveReplayFrames(BigInt(raceId), replayFrames);
        }
        if (saved) {
          await applyRacePayouts(BigInt(raceId), resultHorseIds);
        }

        await prisma.race.update({
          where: { id: BigInt(raceId) },
          data: { endedAt: new Date() }
        });

        const raceRow = await prisma.race.findUnique({
          where: { id: BigInt(raceId) },
          select: { tournamentId: true, heatNumber: true }
        });

        await patchSessionAndBroadcast({
          state: 'finished',
          tournamentId: raceRow?.tournamentId || null,
          heatNumber: Math.min(5, Math.max(1, raceRow?.heatNumber || getRaceSession().heatNumber)) as 1 | 2 | 3 | 4 | 5
        }, 'race');
      } catch (err) {
        console.error(`❌ [KD] Failed to finalize race ${raceId}:`, err);
      }
    });

    socket.on('disconnect', () => {
      raceRuntimeSockets.delete(socket.id);
    });
  });
}

async function handleStartRace({
  raceId,
  horses
}: {
  raceId: string;
  horses: { id: number; name: string; color: string }[];
}) {
  try {
    await prisma.race.update({
      where: { id: BigInt(raceId) },
      data: { startedAt: new Date(), betsLocked: true }
    });
  } catch (err) {
    console.error('[DB] Failed to update race with start time:', err);
    return;
  }

  const race = await prisma.race.findUnique({
    where: { id: BigInt(raceId) },
    select: { name: true, tournamentId: true, heatNumber: true }
  });

  if (!race) return;

  await patchSessionAndBroadcast({
    activeRaceId: String(raceId),
    selectedReplayRaceId: null,
    replayPaused: false,
    state: 'running',
    tournamentId: race.tournamentId,
    heatNumber: Math.min(5, Math.max(1, race.heatNumber || getRaceSession().heatNumber)) as 1 | 2 | 3 | 4 | 5
  }, 'race');

  raceNamespace.emit('race:init', {
    raceId,
    raceName: race.name,
    horses,
    startAtPercent: 0
  });

  raceNamespace.emit('race:start', {
    raceId,
    horses
  });
}

async function saveRaceResults(
  raceId: bigint,
  results: { horseId?: number; localId: number; timeMs: number; position?: number }[]
): Promise<{ saved: boolean; resultHorseIds: number[] }> {
  const existing = await prisma.result.count({ where: { raceId } });
  if (existing > 0) {
    const prior = await prisma.result.findMany({
      where: { raceId },
      orderBy: { position: 'asc' },
      select: { horseId: true }
    });
    return { saved: false, resultHorseIds: prior.map((r) => r.horseId) };
  }

  const cache = raceHorseCache.get(Number(raceId));
  if (!cache) {
    return { saved: false, resultHorseIds: [] };
  }

  const normalized = results
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((entry, index) => {
      const match = cache.find((h) => h.localId === entry.localId);
      const inferredHorseId = match?.horseId ?? match?.id;
      const horseId = entry.horseId ?? inferredHorseId;

      if (typeof horseId !== 'number') {
        throw new Error(`Horse id missing for localId=${entry.localId}`);
      }

      return {
        raceId,
        horseId,
        localId: entry.localId,
        position: entry.position ?? index + 1,
        timeMs: entry.timeMs
      };
    });

  await prisma.result.createMany({ data: normalized });
  return { saved: true, resultHorseIds: normalized.map((r) => r.horseId) };
}

async function applyRacePayouts(raceId: bigint, resultHorseIds: number[]): Promise<void> {
  if (resultHorseIds.length === 0) return;

  const winners = new Map<number, number>();
  if (resultHorseIds[0] !== undefined) winners.set(resultHorseIds[0], 3);
  if (resultHorseIds[1] !== undefined) winners.set(resultHorseIds[1], 2);
  if (resultHorseIds[2] !== undefined) winners.set(resultHorseIds[2], 1.5);

  const bets = await prisma.bet.findMany({ where: { raceId } });
  const payoutsByUser = new Map<number, number>();

  for (const bet of bets) {
    const multiplier = winners.get(bet.horseId);
    if (!multiplier) continue;
    const winnings = Math.floor(bet.amount * multiplier);
    payoutsByUser.set(bet.userId, (payoutsByUser.get(bet.userId) || 0) + winnings);
  }

  if (payoutsByUser.size > 0) {
    await prisma.$transaction(
      Array.from(payoutsByUser.entries()).map(([userId, totalWinnings]) =>
        prisma.user.update({
          where: { id: userId },
          data: { leaseLoons: { increment: totalWinnings } }
        })
      )
    );
  }

  const summary = await buildCanonicalRaceSummary(raceId);
  raceNamespace.emit('race:summary', { raceId: raceId.toString(), summary });
  raceNamespace.emit('leaderboard:updated');
}

async function saveReplayFrames(
  raceId: bigint,
  replayFrames: { horseId?: number; localId?: number; pct: number; timeMs: number }[]
): Promise<void> {
  const existing = await prisma.replayFrame.count({ where: { raceId } });
  if (existing > 0) return;

  const cache = raceHorseCache.get(Number(raceId)) ?? [];
  const byLocalId = new Map(cache.map((h) => [h.localId, h.horseId ?? h.id]));

  const frames = replayFrames
    .map((frame) => {
      const resolvedHorseId = typeof frame.horseId === 'number'
        ? frame.horseId
        : byLocalId.get(frame.localId ?? -1);

      if (typeof resolvedHorseId !== 'number') return null;

      return {
        raceId,
        horseId: resolvedHorseId,
        pct: Math.max(0, Math.min(1, Number(frame.pct) || 0)),
        timeMs: Number(frame.timeMs) || 0
      };
    })
    .filter(Boolean) as { raceId: bigint; horseId: number; pct: number; timeMs: number }[];

  if (frames.length === 0) return;
  await prisma.replayFrame.createMany({ data: frames });
}

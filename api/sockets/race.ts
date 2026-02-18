// File: api/sockets/race.ts
// Version: v2.9.0 — Adds first-finish winner preview event and shared RaceSession broadcasts
// Date: 2026-02-18

import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { raceHorseCache } from '../routes/admin.js';
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

export function emitSessionUpdate(origin = 'server') {
  if (!raceNamespace) return;
  raceNamespace.emit('session:update', { session: getRaceSession(), origin });
}

export function patchSessionAndBroadcast(patch: Parameters<typeof updateRaceSession>[0], origin = 'server') {
  updateRaceSession(patch);
  emitSessionUpdate(origin);
}

export function beginReplayAndBroadcast(raceId: string, origin = 'admin') {
  startReplaySession(raceId);
  emitSessionUpdate(origin);
}

export function stopReplayAndBroadcast(origin = 'admin') {
  stopReplaySession();
  emitSessionUpdate(origin);
}

export function clearReplayAndBroadcast(origin = 'admin') {
  clearReplaySession();
  emitSessionUpdate(origin);
}

async function buildWinnerPreview(raceId: bigint, horseId: number) {
  const bets = await prisma.bet.findMany({
    where: { raceId, horseId },
    orderBy: { amount: 'desc' },
    select: {
      amount: true,
      user: {
        select: {
          nickname: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  const topBet = bets[0] || null;
  const bettorName = topBet
    ? topBet.user.nickname || [topBet.user.firstName, topBet.user.lastName].filter(Boolean).join(' ') || 'Unknown bettor'
    : 'No bets placed';

  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true, bodyHex: true, saddleHex: true }
  });

  if (!horse) return null;

  const horseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${horse.bodyHex}"/><circle cx="47" cy="28" r="9" fill="${horse.bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${horse.saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;

  return {
    raceId: raceId.toString(),
    bettorName,
    winnings: topBet ? topBet.amount * 3 : 0,
    horseName: horse.name,
    horseImage: `data:image/svg+xml;utf8,${encodeURIComponent(horseSvg)}`,
    bodyHex: horse.bodyHex,
    saddleHex: horse.saddleHex
  };
}

export function setupRaceNamespace(io: Server): void {
  raceNamespace = io.of('/race');

  bootstrapRaceSession(prisma)
    .then(() => emitSessionUpdate('bootstrap'))
    .catch((err) => console.error('❌ [Session] bootstrap failed:', err));

  raceNamespace.on('connection', (socket: Socket) => {
    console.log('✅ [WS] Client connected to /race:', socket.id);
    socket.emit('session:init', { session: getRaceSession() });

    socket.on('session:request-init', () => {
      socket.emit('session:init', { session: getRaceSession() });
    });

    socket.on('race:order', (payload) => {
      raceNamespace.emit('race:order', payload);
    });

    socket.on('race:first-finish', async ({ raceId, horseId, localId }) => {
      try {
        const numericRaceId = BigInt(raceId);
        let resolvedHorseId = Number(horseId);

        if (!Number.isInteger(resolvedHorseId) && Number.isInteger(Number(localId))) {
          const cache = raceHorseCache.get(Number(raceId)) || [];
          const match = cache.find((h) => h.localId === Number(localId));
          resolvedHorseId = Number(match?.id || match?.horseId);
        }

        if (!Number.isInteger(resolvedHorseId)) return;

        const winner = await buildWinnerPreview(numericRaceId, resolvedHorseId);
        if (!winner) return;

        raceNamespace.emit('winner:preview', { winner });
      } catch (err) {
        console.error('❌ [KD] Failed to build winner preview:', err);
      }
    });

    socket.on('startRace', handleStartRace);
    socket.on('admin:start-race', (payload) => handleStartRace(payload));

    socket.on('admin:open-bets', () => {
      patchSessionAndBroadcast({ state: 'betting_open' }, 'admin');
      raceNamespace.emit('admin:open-bets');
    });

    socket.on('admin:close-bets', () => {
      patchSessionAndBroadcast({ state: 'betting_closed' }, 'admin');
      raceNamespace.emit('admin:close-bets');
    });

    socket.on('admin:replay-start', ({ raceId }) => {
      if (!raceId) return;
      beginReplayAndBroadcast(String(raceId), 'admin');
    });

    socket.on('admin:replay-stop', () => {
      stopReplayAndBroadcast('admin');
    });

    socket.on('admin:replay-clear', () => {
      clearReplayAndBroadcast('admin');
    });

    socket.on('race:setup-failed', async ({ raceId, reason }: { raceId: string; reason: string }) => {
      try {
        const deleted = await prisma.race.delete({ where: { id: BigInt(raceId) } });
        console.log('🗑️ [DB] Invalid race deleted:', deleted.id.toString());
      } catch (err) {
        console.error('❌ [DB] Failed to delete invalid race:', err);
      }
      patchSessionAndBroadcast({ state: 'cleared' }, 'race');
      raceNamespace.emit('race:setup-aborted', { raceId, reason });
    });

    socket.on('race:finish', async ({ raceId, leaderboard, results, replayFrames = [] }) => {
      console.log(`🏁 [KD] Received race:finish for raceId=${raceId} — saving results`);

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
        patchSessionAndBroadcast({ state: 'finished' }, 'race');
        console.log(`✅ [KD] Race ${raceId} marked as ended`);
      } catch (err) {
        console.error(`❌ [KD] Failed to finalize race ${raceId}:`, err);
      }
    });
  });
}

async function handleStartRace({
  raceId,
  horses,
  horsePaths
}: {
  raceId: string;
  horses: { id: number; name: string; color: string }[];
  horsePaths: Record<number, any>;
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

  patchSessionAndBroadcast({
    activeRaceId: String(raceId),
    selectedReplayRaceId: null,
    replayPaused: false,
    state: 'running'
  }, 'race');

  const race = await prisma.race.findUnique({
    where: { id: BigInt(raceId) },
    select: { name: true }
  });

  if (!race) {
    console.error(`[KD] ❌ No race found for raceId=${raceId}`);
    return;
  }

  raceNamespace.emit('race:init', {
    raceId,
    raceName: race.name,
    horses,
    horsePaths
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
    console.log(`[KD] ℹ️ Results already exist for race ${raceId}; skipping duplicate save`);
    const prior = await prisma.result.findMany({
      where: { raceId },
      orderBy: { position: 'asc' },
      select: { horseId: true }
    });
    return { saved: false, resultHorseIds: prior.map((r) => r.horseId) };
  }

  const cache = raceHorseCache.get(Number(raceId));
  if (!cache) {
    console.warn(`[KD] ⚠️ No horse cache found for race ${raceId}`);
    return { saved: false, resultHorseIds: [] };
  }

  const normalized = results.map((entry, index) => {
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
  console.log(`[KD] ✅ Saved ${normalized.length} race results`);
  return { saved: true, resultHorseIds: normalized.map((r) => r.horseId) };
}

async function applyRacePayouts(raceId: bigint, resultHorseIds: number[]): Promise<void> {
  if (resultHorseIds.length === 0) return;

  const winners = new Map<number, number>();
  if (resultHorseIds[0] !== undefined) winners.set(resultHorseIds[0], 3);
  if (resultHorseIds[1] !== undefined) winners.set(resultHorseIds[1], 2);
  if (resultHorseIds[2] !== undefined) winners.set(resultHorseIds[2], 1.5);

  if (winners.size === 0) return;

  const bets = await prisma.bet.findMany({ where: { raceId } });
  const payoutsByUser = new Map<number, number>();

  for (const bet of bets) {
    const multiplier = winners.get(bet.horseId);
    if (!multiplier) continue;
    const winnings = Math.floor(bet.amount * multiplier);
    payoutsByUser.set(bet.userId, (payoutsByUser.get(bet.userId) || 0) + winnings);
  }

  if (payoutsByUser.size === 0) {
    console.log(`[KD] ℹ️ No payout winners for race ${raceId}`);
    return;
  }

  await prisma.$transaction(
    Array.from(payoutsByUser.entries()).map(([userId, totalWinnings]) =>
      prisma.user.update({
        where: { id: userId },
        data: { leaseLoons: { increment: totalWinnings } }
      })
    )
  );

  console.log(`[KD] ✅ Paid out ${payoutsByUser.size} users for race ${raceId}`);
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
  console.log(`[KD] ✅ Saved ${frames.length} replay frames for race ${raceId}`);
}

// File: api/sockets/race.ts
// Version: v3.2.0 — Canonical server-side ordering and replay load/play/pause/seek controls
// Date: 2026-02-19

import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { raceHorseCache } from '../routes/admin.js';
import { buildCanonicalRaceSummary } from '../lib/raceSummary.js';
import {
  bootstrapRaceSession,
  clearReplaySession,
  getRaceSession,
  resumeReplaySession,
  startReplaySession,
  stopReplaySession,
  updateRaceSession
} from '../lib/raceSession.js';

const prisma = new PrismaClient();
export let raceNamespace: ReturnType<Server['of']>;

const DEFAULT_BODY_HEX = '#a0522d';
const DEFAULT_SADDLE_HEX = '#888888';

interface ReplayTickHorse {
  horseId: number;
  localId: number;
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
  elapsedMs: number;
  durationMs: number;
  playbackRate: number;
  timeline: Array<{ timeMs: number; frames: ReplayTickHorse[] }>;
  latestByHorse: Map<number, ReplayTickHorse>;
}

interface RankingSeed {
  id?: number | null;
  horseId?: number | null;
  localId?: number | null;
  name?: string | null;
  bodyHex?: string | null;
  saddleHex?: string | null;
  normalizedProgress?: number | null;
  pct?: number | null;
  position?: number | null;
}

interface RankingEntry {
  id: number;
  horseId: number;
  localId: number | null;
  name: string;
  bodyHex: string;
  saddleHex: string;
  normalizedProgress: number;
  pct: number;
  position: number;
}

interface RaceOrderPayload {
  raceId?: string | number | bigint;
  elapsedMs?: number;
  ranking?: RankingSeed[];
}

interface RaceProgressPayload {
  raceId?: string | number | bigint;
  elapsedMs?: number;
  progress?: RankingSeed[];
}

let replayRuntime: ReplayRuntimeState | null = null;
const raceRuntimeSockets = new Set<string>();

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clampProgress(value: unknown): number {
  const numeric = toNumberOrNull(value) ?? 0;
  return Math.max(0, Math.min(1, numeric));
}

function parseRaceId(value: unknown): string | null {
  if (typeof value === 'bigint') {
    return value > 0n ? value.toString() : null;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
  }

  return null;
}

function enrichRankingFromCache(raceId: string | null, ranking: RankingSeed[]): RankingSeed[] {
  if (!raceId) return ranking;

  const cache = raceHorseCache.get(Number(raceId)) ?? [];
  if (cache.length === 0) return ranking;

  const byLocalId = new Map<number, any>();
  const byHorseId = new Map<number, any>();

  cache.forEach((entry) => {
    const local = toNumberOrNull(entry?.localId);
    if (local != null) byLocalId.set(local, entry);

    const horseId = toNumberOrNull(entry?.horseId ?? entry?.id);
    if (horseId != null) byHorseId.set(horseId, entry);
  });

  return ranking.map((row) => {
    const localId = toNumberOrNull(row.localId);
    const horseId = toNumberOrNull(row.horseId ?? row.id);

    const cached = (
      (localId != null ? byLocalId.get(localId) : null)
      || (horseId != null ? byHorseId.get(horseId) : null)
      || null
    );

    const resolvedHorseId = toNumberOrNull(row.horseId ?? row.id ?? cached?.horseId ?? cached?.id);

    return {
      id: resolvedHorseId,
      horseId: resolvedHorseId,
      localId: toNumberOrNull(row.localId ?? cached?.localId),
      name: (row.name ?? cached?.name ?? '') as string,
      bodyHex: (row.bodyHex ?? cached?.bodyHex ?? DEFAULT_BODY_HEX) as string,
      saddleHex: (row.saddleHex ?? cached?.saddleHex ?? DEFAULT_SADDLE_HEX) as string,
      normalizedProgress: row.normalizedProgress ?? row.pct ?? 0,
      pct: row.pct ?? row.normalizedProgress ?? 0
    };
  });
}

function normalizeAndSortRanking(ranking: RankingSeed[]): RankingEntry[] {
  const byHorseId = new Map<number, Omit<RankingEntry, 'position'>>();

  ranking.forEach((entry) => {
    const horseId = toNumberOrNull(entry.horseId ?? entry.id);
    if (horseId == null || horseId <= 0) return;

    const normalizedProgress = clampProgress(entry.normalizedProgress ?? entry.pct ?? 0);
    const existing = byHorseId.get(horseId);

    const merged: Omit<RankingEntry, 'position'> = {
      id: horseId,
      horseId,
      localId: toNumberOrNull(entry.localId) ?? existing?.localId ?? null,
      name: (entry.name ?? existing?.name ?? '') as string,
      bodyHex: (entry.bodyHex ?? existing?.bodyHex ?? DEFAULT_BODY_HEX) as string,
      saddleHex: (entry.saddleHex ?? existing?.saddleHex ?? DEFAULT_SADDLE_HEX) as string,
      normalizedProgress,
      pct: normalizedProgress
    };

    if (!existing || normalizedProgress >= existing.normalizedProgress) {
      byHorseId.set(horseId, merged);
      return;
    }

    byHorseId.set(horseId, {
      ...existing,
      localId: existing.localId ?? merged.localId,
      name: existing.name || merged.name,
      bodyHex: existing.bodyHex || merged.bodyHex,
      saddleHex: existing.saddleHex || merged.saddleHex
    });
  });

  return Array.from(byHorseId.values())
    .sort((a, b) => {
      if (b.normalizedProgress !== a.normalizedProgress) {
        return b.normalizedProgress - a.normalizedProgress;
      }

      const localA = a.localId ?? Number.MAX_SAFE_INTEGER;
      const localB = b.localId ?? Number.MAX_SAFE_INTEGER;
      if (localA !== localB) return localA - localB;

      return a.id - b.id;
    })
    .map((entry, idx) => ({
      ...entry,
      position: idx + 1
    }));
}

function pauseReplayRuntime() {
  if (!replayRuntime) return;
  replayRuntime.paused = true;
  replayRuntime.running = false;

  if (replayRuntime.timer) {
    clearInterval(replayRuntime.timer);
    replayRuntime.timer = null;
  }
}

function stopReplayRuntime() {
  pauseReplayRuntime();
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
        index: true,
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

  const horseById = new Map(horses.map((hp) => [hp.horse.id, {
    ...hp.horse,
    localId: hp.index + 1
  }]));

  const grouped = new Map<number, ReplayTickHorse[]>();

  frames.forEach((frame) => {
    const horse = horseById.get(frame.horseId);
    if (!horse) return;

    const bucket = grouped.get(frame.timeMs) || [];
    bucket.push({
      horseId: horse.id,
      localId: horse.localId,
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

function applyReplaySnapshot(elapsedMs: number) {
  if (!replayRuntime) return;

  const clamped = Math.max(0, Math.min(replayRuntime.durationMs, Math.floor(elapsedMs)));
  replayRuntime.elapsedMs = clamped;
  replayRuntime.latestByHorse.clear();

  for (const entry of replayRuntime.timeline) {
    if (entry.timeMs > clamped) break;
    entry.frames.forEach((frame) => replayRuntime?.latestByHorse.set(frame.horseId, frame));
  }
}

function emitReplayTick() {
  if (!replayRuntime) return;

  const ranking = normalizeAndSortRanking(
    Array.from(replayRuntime.latestByHorse.values()).map((horse) => ({
      id: horse.horseId,
      horseId: horse.horseId,
      localId: horse.localId,
      name: horse.name,
      bodyHex: horse.bodyHex,
      saddleHex: horse.saddleHex,
      normalizedProgress: horse.pct,
      pct: horse.pct
    }))
  );

  raceNamespace?.emit('replay:tick', {
    raceId: replayRuntime.raceId,
    elapsedMs: replayRuntime.elapsedMs,
    durationMs: replayRuntime.durationMs,
    rate: replayRuntime.playbackRate,
    ranking
  });
}

async function loadReplayRuntime(raceId: string): Promise<boolean> {
  stopReplayRuntime();

  const numericRaceId = BigInt(raceId);
  const timeline = await buildReplayTimeline(numericRaceId);
  if (timeline.length === 0) {
    raceNamespace?.emit('replay:empty', { raceId });
    return false;
  }

  const durationMs = Math.max(0, timeline[timeline.length - 1]?.timeMs || 0);
  replayRuntime = {
    raceId,
    running: false,
    paused: true,
    timer: null,
    startedAtMs: Date.now(),
    elapsedMs: 0,
    durationMs,
    playbackRate: 1,
    timeline,
    latestByHorse: new Map()
  };

  applyReplaySnapshot(0);

  raceNamespace?.emit('replay:loaded', {
    raceId,
    elapsedMs: 0,
    durationMs,
    rate: replayRuntime.playbackRate
  });
  emitReplayTick();
  return true;
}

function startReplayTicker(origin: string) {
  if (!replayRuntime) return;

  pauseReplayRuntime();
  replayRuntime.running = true;
  replayRuntime.paused = false;
  replayRuntime.startedAtMs = Date.now() - (replayRuntime.elapsedMs / Math.max(0.25, replayRuntime.playbackRate || 1));

  raceNamespace?.emit('replay:started', {
    raceId: replayRuntime.raceId,
    elapsedMs: replayRuntime.elapsedMs,
    durationMs: replayRuntime.durationMs,
    rate: replayRuntime.playbackRate
  });

  emitReplayTick();

  replayRuntime.timer = setInterval(() => {
    if (!replayRuntime || replayRuntime.paused || !replayRuntime.running) return;

    const elapsed = (Date.now() - replayRuntime.startedAtMs) * Math.max(0.25, replayRuntime.playbackRate || 1);
    applyReplaySnapshot(elapsed);
    emitReplayTick();

    if (replayRuntime.elapsedMs >= replayRuntime.durationMs) {
      pauseReplayRuntime();
      raceNamespace?.emit('replay:finished', {
        raceId: replayRuntime.raceId,
        durationMs: replayRuntime.durationMs,
        rate: replayRuntime.playbackRate
      });

      void stopReplaySession()
        .then(() => emitSessionUpdate(origin))
        .catch((err) => console.error('❌ [Replay] Failed to persist finished replay state:', err));
    }
  }, 100);
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
  await startReplaySession(raceId, true);
  emitSessionUpdate(origin);

  const loaded = await loadReplayRuntime(raceId);
  if (!loaded) {
    await clearReplaySession();
    emitSessionUpdate(origin);
    return false;
  }

  return true;
}

export async function playReplayAndBroadcast(origin = 'admin') {
  const session = getRaceSession();
  const replayRaceId = replayRuntime?.raceId || session.selectedReplayRaceId;
  if (!replayRaceId) return false;

  if (!replayRuntime || replayRuntime.raceId !== replayRaceId) {
    const loaded = await loadReplayRuntime(replayRaceId);
    if (!loaded) return false;
  }

  const latestSession = getRaceSession();
  if (latestSession.state !== 'replaying' || latestSession.selectedReplayRaceId !== replayRaceId) {
    await startReplaySession(replayRaceId, false);
  } else {
    await resumeReplaySession();
  }

  emitSessionUpdate(origin);
  startReplayTicker(origin);
  return true;
}

export async function stopReplayAndBroadcast(origin = 'admin') {
  pauseReplayRuntime();
  await stopReplaySession();
  emitSessionUpdate(origin);

  raceNamespace?.emit('replay:paused', {
    raceId: replayRuntime?.raceId || getRaceSession().selectedReplayRaceId,
    elapsedMs: replayRuntime?.elapsedMs || 0,
    durationMs: replayRuntime?.durationMs || 0,
    rate: replayRuntime?.playbackRate || 1
  });

  return true;
}

export async function seekReplayAndBroadcast(timeMs: number, origin = 'admin') {
  const session = getRaceSession();
  const replayRaceId = replayRuntime?.raceId || session.selectedReplayRaceId;
  if (!replayRaceId) return false;

  if (!replayRuntime || replayRuntime.raceId !== replayRaceId) {
    const loaded = await loadReplayRuntime(replayRaceId);
    if (!loaded) return false;
  }

  pauseReplayRuntime();
  applyReplaySnapshot(timeMs);
  emitReplayTick();

  await stopReplaySession();
  emitSessionUpdate(origin);

  raceNamespace?.emit('replay:seeked', {
    raceId: replayRuntime?.raceId,
    elapsedMs: replayRuntime?.elapsedMs || 0,
    durationMs: replayRuntime?.durationMs || 0,
    rate: replayRuntime?.playbackRate || 1
  });

  return true;
}

export async function setReplaySpeedAndBroadcast(rate: number, origin = 'admin') {
  const clampedRate = Math.max(0.25, Math.min(3, Number(rate) || 1));
  const session = getRaceSession();
  const replayRaceId = replayRuntime?.raceId || session.selectedReplayRaceId;
  if (!replayRaceId) return false;

  if (!replayRuntime || replayRuntime.raceId !== replayRaceId) {
    const loaded = await loadReplayRuntime(replayRaceId);
    if (!loaded) return false;
  }

  if (!replayRuntime) return false;
  replayRuntime.playbackRate = clampedRate;

  if (replayRuntime.running) {
    replayRuntime.startedAtMs = Date.now() - (replayRuntime.elapsedMs / clampedRate);
  }

  raceNamespace?.emit('replay:rate', {
    raceId: replayRuntime.raceId,
    rate: clampedRate,
    elapsedMs: replayRuntime.elapsedMs,
    durationMs: replayRuntime.durationMs
  });

  emitSessionUpdate(origin);
  return true;
}

export async function clearReplayAndBroadcast(origin = 'admin') {
  stopReplayRuntime();
  await clearReplaySession();
  emitSessionUpdate(origin);
  raceNamespace?.emit('replay:cleared');
}

export function setupRaceNamespace(io: Server): void {
  raceNamespace = io.of('/race');

  bootstrapRaceSession()
    .then(async (session) => {
      emitSessionUpdate('bootstrap');

      if (session.state === 'replaying' && session.selectedReplayRaceId) {
        const loaded = await loadReplayRuntime(session.selectedReplayRaceId);
        if (loaded && !session.replayPaused) {
          startReplayTicker('bootstrap');
        }
      }
    })
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

    socket.on('race:progress', (payload: RaceProgressPayload = {}) => {
      if (!raceRuntimeSockets.has(socket.id)) return;

      const session = getRaceSession();
      if (session.state === 'replaying') return;

      const raceId = parseRaceId(payload.raceId) || (session.activeRaceId ? String(session.activeRaceId) : null);
      if (!raceId) return;
      if (session.activeRaceId && String(session.activeRaceId) !== String(raceId)) return;

      const progress = Array.isArray(payload.progress) ? payload.progress : [];
      const enriched = enrichRankingFromCache(
        raceId,
        progress.map((row) => ({
          ...row,
          normalizedProgress: row.normalizedProgress ?? row.pct ?? 0
        }))
      );

      const canonical = normalizeAndSortRanking(enriched);
      if (canonical.length === 0) return;

      raceNamespace.emit('race:order', {
        raceId,
        elapsedMs: Number(payload.elapsedMs) || 0,
        ranking: canonical
      });
    });

    // Backward compatibility for legacy clients that still emit race:order directly.
    socket.on('race:order', (payload: RaceOrderPayload = {}) => {
      if (!raceRuntimeSockets.has(socket.id)) return;

      const session = getRaceSession();
      if (session.state === 'replaying') return;

      const raceId = parseRaceId(payload.raceId) || (session.activeRaceId ? String(session.activeRaceId) : null);
      if (!raceId) return;
      if (session.activeRaceId && String(session.activeRaceId) !== String(raceId)) return;

      const ranking = Array.isArray(payload.ranking) ? payload.ranking : [];
      const canonical = normalizeAndSortRanking(enrichRankingFromCache(raceId, ranking));
      if (canonical.length === 0) return;

      raceNamespace.emit('race:order', {
        raceId,
        elapsedMs: Number(payload.elapsedMs) || 0,
        ranking: canonical
      });
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

    socket.on('admin:replay-play', async () => {
      await playReplayAndBroadcast('admin');
    });

    socket.on('admin:replay-stop', async () => {
      await stopReplayAndBroadcast('admin');
    });

    socket.on('admin:replay-seek', async ({ timeMs }) => {
      await seekReplayAndBroadcast(Number(timeMs) || 0, 'admin');
    });

    socket.on('admin:replay-rate', async ({ rate }) => {
      await setReplaySpeedAndBroadcast(Number(rate) || 1, 'admin');
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

// File: api/routes/admin.ts
// Version: v3.0.0 — Adds shared-session replay controls, 5-race tournament flow, and live user update broadcasts
// Date: 2026-02-18

import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import prisma from '../lib/prisma';
import {
  beginReplayAndBroadcast,
  clearReplayAndBroadcast,
  patchSessionAndBroadcast,
  raceNamespace,
  stopReplayAndBroadcast
} from '../sockets/race.js';

const router = express.Router();
export const raceHorseCache = new Map<number, any[]>();

const DEFAULT_LOONS = 1000;

interface TournamentState {
  id: string;
  horsePoolIds: number[];
  heatHorseIds: number[][];
  winnerHorseIds: number[];
  raceIds: number[];
}

let tournamentState: TournamentState | null = null;

function isAuthorized(req: Request): boolean {
  return req.headers['x-admin-pass'] === process.env.API_ADMIN_PASS;
}

function shuffle<T>(values: T[]): T[] {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function ensureTournamentState(): Promise<TournamentState> {
  if (tournamentState) return tournamentState;

  const horses = await prisma.horse.findMany({
    select: { id: true },
    orderBy: { id: 'asc' }
  });

  if (horses.length < 16) {
    throw new Error('At least 16 horses are required to start a tournament');
  }

  const horsePoolIds = shuffle(horses.map((h) => h.id)).slice(0, 16);
  const heatHorseIds = [
    horsePoolIds.slice(0, 4),
    horsePoolIds.slice(4, 8),
    horsePoolIds.slice(8, 12),
    horsePoolIds.slice(12, 16)
  ];

  tournamentState = {
    id: `tournament-${Date.now()}`,
    horsePoolIds,
    heatHorseIds,
    winnerHorseIds: [],
    raceIds: []
  };

  return tournamentState;
}

async function getTopHeatWinners(raceIds: number[]): Promise<number[]> {
  const winners = await prisma.result.findMany({
    where: {
      raceId: { in: raceIds.map((id) => BigInt(id)) },
      position: 1
    },
    orderBy: [{ raceId: 'asc' }],
    select: { raceId: true, horseId: true }
  });

  const byRace = new Map<number, number>();
  winners.forEach((row) => byRace.set(Number(row.raceId), row.horseId));

  return raceIds
    .map((raceId) => byRace.get(raceId))
    .filter((horseId): horseId is number => typeof horseId === 'number');
}

async function loadRaceHorses(horseIds: number[]) {
  const selected = await prisma.horse.findMany({
    where: { id: { in: horseIds } },
    select: {
      id: true,
      name: true,
      bodyColor: true,
      bodyHex: true,
      saddleColor: true,
      saddleHex: true
    }
  });

  const byId = new Map(selected.map((h) => [h.id, h]));
  return horseIds
    .map((id, index) => {
      const horse = byId.get(id);
      if (!horse) return null;
      return { ...horse, localId: index + 1 };
    })
    .filter((horse): horse is NonNullable<typeof horse> => Boolean(horse));
}

async function createRaceWithHorses(
  raceName: string,
  raceType: 'heat' | 'final',
  horseIds: number[],
  heatNumber: 1 | 2 | 3 | 4 | 5
) {
  const horses = await loadRaceHorses(horseIds);
  if (horses.length !== 4) throw new Error('Could not load four horses for race');

  const race = await prisma.race.create({
    data: {
      name: raceName,
      type: raceType,
      isFinal: heatNumber === 5,
      isTest: false,
      betsLocked: false,
      startedAt: null,
      endedAt: null,
      betClosesAt: null
    }
  });

  raceHorseCache.set(Number(race.id), horses);

  await prisma.horsePath.createMany({
    data: horses.map((horse, i) => ({
      raceId: race.id,
      horseId: horse.id,
      index: i,
      x: 0,
      y: 0
    }))
  });

  if (raceNamespace) {
    raceNamespace.emit('race:init', {
      raceId: Number(race.id),
      raceName,
      horses,
      startAtPercent: 0
    });
  }

  patchSessionAndBroadcast({
    activeRaceId: race.id.toString(),
    tournamentId: tournamentState?.id || null,
    heatNumber,
    state: 'setup',
    selectedReplayRaceId: null,
    replayPaused: false
  }, 'admin');

  return { raceId: Number(race.id), horses };
}

router.get('/tournament-state', async (_req: Request, res: Response) => {
  try {
    const state = await ensureTournamentState();
    const horsePool = await loadRaceHorses(state.horsePoolIds);
    const winners = await loadRaceHorses(state.winnerHorseIds);

    res.json({
      success: true,
      tournamentId: state.id,
      horsePool,
      winners,
      heatNumber: Math.min(5, state.raceIds.length + 1)
    });
  } catch (err) {
    console.error('❌ Failed to fetch tournament state:', err);
    res.status(500).json({ error: 'Failed to fetch tournament state' });
  }
});

router.post('/clear-horses', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  raceHorseCache.clear();
  patchSessionAndBroadcast({ state: 'cleared' }, 'admin');
  raceNamespace?.emit('admin:clear-stage');
  res.status(200).json({ message: '✅ Cleared race horses and stage' });
});

router.post('/reset-dev', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    await new Promise<void>((resolve, reject) => {
      exec('npx prisma db push --force-reset && npx tsx prisma/seed-dev.ts', (err, stdout) => {
        if (err) return reject(err);
        console.log('[KD] ✅ reset-dev output:\n', stdout);
        resolve();
      });
    });

    tournamentState = null;
    raceHorseCache.clear();
    patchSessionAndBroadcast({
      activeRaceId: null,
      tournamentId: null,
      heatNumber: 1,
      state: 'setup',
      selectedReplayRaceId: null,
      replayPaused: false
    }, 'admin');

    raceNamespace?.emit('leaderboard:updated');
    res.status(200).json({ message: '✅ Full dev reset complete (seed-dev.ts)' });
  } catch (err) {
    console.error('[KD] ❌ reset-dev failed:', err);
    res.status(500).json({ error: 'Failed to run reset-dev' });
  }
});

router.post('/seed-reset', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    await new Promise<void>((resolve, reject) => {
      exec('npx prisma db push --force-reset && npx tsx prisma/seed.ts', (err, stdout) => {
        if (err) return reject(err);
        console.log('[KD] ✅ seed-reset output:\n', stdout);
        resolve();
      });
    });

    tournamentState = null;
    raceHorseCache.clear();
    patchSessionAndBroadcast({
      activeRaceId: null,
      tournamentId: null,
      heatNumber: 1,
      state: 'setup',
      selectedReplayRaceId: null,
      replayPaused: false
    }, 'admin');

    raceNamespace?.emit('leaderboard:updated');
    res.status(200).json({ message: '✅ Full database reset complete (seed.ts)' });
  } catch (err) {
    console.error('[KD] ❌ seed-reset failed:', err);
    res.status(500).json({ error: 'Failed to run seed-reset' });
  }
});

router.post('/generate-race', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const state = await ensureTournamentState();
    const nextHeat = (state.raceIds.length + 1) as 1 | 2 | 3 | 4 | 5;

    if (nextHeat > 5) {
      return res.status(400).json({ error: 'Tournament already has 5 races. Reset races to start a new tournament.' });
    }

    let horseIds: number[];
    let raceName: string;
    let raceType: 'heat' | 'final' = 'heat';

    if (nextHeat <= 4) {
      horseIds = state.heatHorseIds[nextHeat - 1];
      raceName = `Heat ${nextHeat} • ${state.id}`;
    } else {
      const winnerHorseIds = await getTopHeatWinners(state.raceIds.slice(0, 4));
      if (winnerHorseIds.length < 4) {
        return res.status(400).json({ error: 'Heat winners are not ready yet. Finish heats 1-4 first.' });
      }
      state.winnerHorseIds = winnerHorseIds.slice(0, 4);
      horseIds = state.winnerHorseIds;
      raceName = `Final • ${state.id}`;
      raceType = 'final';
    }

    const created = await createRaceWithHorses(raceName, raceType, horseIds, nextHeat);
    state.raceIds.push(created.raceId);

    res.status(200).json({
      success: true,
      message: `Race ${nextHeat} created`,
      raceId: created.raceId,
      raceName,
      horses: created.horses,
      tournamentId: state.id,
      heatNumber: nextHeat,
      horsePoolIds: state.horsePoolIds,
      winnerHorseIds: state.winnerHorseIds
    });
  } catch (err) {
    console.error('❌ Failed to generate race:', err);
    res.status(500).json({ error: 'Failed to generate race', detail: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { leaseLoons: 'desc' },
      select: { id: true, nickname: true, leaseLoons: true }
    });

    res.json({ success: true, leaderboard: users });
  } catch (err) {
    console.error('❌ Failed to fetch leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.post('/reset-tournament', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    await prisma.replayFrame.deleteMany();
    await prisma.result.deleteMany();
    await prisma.bet.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.horsePath.deleteMany();
    await prisma.race.deleteMany();
    await prisma.raceName.updateMany({ data: { used: false, usedAt: null } });

    tournamentState = null;
    raceHorseCache.clear();

    raceNamespace?.emit('admin:clear-stage');
    patchSessionAndBroadcast({
      activeRaceId: null,
      tournamentId: null,
      heatNumber: 1,
      state: 'setup',
      selectedReplayRaceId: null,
      replayPaused: false
    }, 'admin');

    res.status(200).json({ message: '✅ Reset races and horses complete. Users and loons were preserved.' });
  } catch (err) {
    console.error('❌ Failed to reset tournament:', err);
    res.status(500).json({ error: 'Failed to reset tournament' });
  }
});

router.post('/start-race', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const latest = await prisma.race.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
    if (!latest) return res.status(404).json({ error: 'No race found to start' });

    const horses = raceHorseCache.get(Number(latest.id));
    if (!horses || horses.length !== 4) {
      return res.status(400).json({ error: 'No cached horses found for this race. Generate race first.' });
    }

    patchSessionAndBroadcast({
      activeRaceId: latest.id.toString(),
      state: 'running'
    }, 'admin');

    raceNamespace?.emit('admin:start-race', {
      raceId: Number(latest.id),
      horses
    });

    res.status(200).json({ message: 'Race started', raceId: Number(latest.id) });
  } catch (err) {
    console.error('❌ Failed to start race:', err);
    res.status(500).json({ error: 'Failed to start race' });
  }
});

router.post('/open-bets', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const latest = await prisma.race.findFirst({
      orderBy: { id: 'desc' },
      where: { endedAt: null },
      select: { id: true }
    });

    if (!latest) return res.status(404).json({ error: 'No active race found' });

    const seconds = parseInt(req.body.seconds || '60', 10);
    const betClosesAt = new Date(Date.now() + seconds * 1000);

    await prisma.race.update({
      where: { id: latest.id },
      data: { betClosesAt, betsLocked: false }
    });

    patchSessionAndBroadcast({ state: 'betting_open' }, 'admin');
    raceNamespace?.emit('admin:open-bets');
    res.json({ success: true, message: `Bets are now open for ${seconds} seconds.` });
  } catch (err) {
    console.error('❌ Failed to open bets:', err);
    res.status(500).json({ error: 'Failed to open bets.' });
  }
});

router.post('/close-bets', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const latest = await prisma.race.findFirst({
      orderBy: { id: 'desc' },
      where: { endedAt: null },
      select: { id: true }
    });

    if (!latest) return res.status(404).json({ error: 'No active race found' });

    await prisma.race.update({
      where: { id: latest.id },
      data: { betClosesAt: new Date(), betsLocked: true }
    });

    patchSessionAndBroadcast({ state: 'betting_closed' }, 'admin');
    raceNamespace?.emit('admin:close-bets');
    res.json({ success: true, message: 'Bets are now closed.' });
  } catch (err) {
    console.error('❌ Failed to close bets:', err);
    res.status(500).json({ error: 'Failed to close bets.' });
  }
});

router.post('/replay/start', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const raceId = String(req.body.raceId || '').trim();
  if (!raceId || Number.isNaN(Number(raceId))) {
    return res.status(400).json({ error: 'Valid raceId is required' });
  }

  beginReplayAndBroadcast(raceId, 'admin');
  res.json({ success: true, message: `Replay started for race ${raceId}` });
});

router.post('/replay/stop', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });
  stopReplayAndBroadcast('admin');
  res.json({ success: true, message: 'Replay paused' });
});

router.post('/replay/clear', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });
  clearReplayAndBroadcast('admin');
  res.json({ success: true, message: 'Replay cleared' });
});

router.get('/users', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        deviceId: true,
        firstName: true,
        lastName: true,
        nickname: true,
        leaseLoons: true
      }
    });

    res.json({ success: true, users });
  } catch (err) {
    console.error('❌ Failed to list users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.put('/user/:deviceId', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { deviceId } = req.params;
  const updates: Record<string, unknown> = {};

  for (const key of ['firstName', 'lastName', 'nickname', 'leaseLoons']) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { deviceId: { equals: deviceId, mode: 'insensitive' } },
      select: { id: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({ where: { id: user.id }, data: updates });
    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('❌ Failed to update user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/user/:deviceId/add-loons', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { deviceId } = req.params;
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount)) return res.status(400).json({ error: 'Valid amount required' });

  try {
    const user = await prisma.user.findFirst({
      where: { deviceId: { equals: deviceId, mode: 'insensitive' } },
      select: { id: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { leaseLoons: { increment: Math.trunc(amount) } }
    });

    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('❌ Failed to add loons:', err);
    res.status(500).json({ error: 'Failed to add loons' });
  }
});

router.delete('/user/:deviceId', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  const { deviceId } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: { deviceId: { equals: deviceId, mode: 'insensitive' } },
      select: { id: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.bet.deleteMany({ where: { userId: user.id } });
    await prisma.registration.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/reset-loons', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const result = await prisma.user.updateMany({ data: { leaseLoons: DEFAULT_LOONS } });
    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true, updatedUsers: result.count });
  } catch (err) {
    console.error('❌ Failed to reset loons:', err);
    res.status(500).json({ error: 'Failed to reset loons' });
  }
});

export default router;

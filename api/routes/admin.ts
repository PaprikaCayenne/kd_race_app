// File: api/routes/admin.ts
// Version: v3.1.0 — DB-backed tournament flow, replay control, and robust user admin APIs
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
import { getRaceSession } from '../lib/raceSession.js';

const router = express.Router();
export const raceHorseCache = new Map<number, any[]>();

const DEFAULT_LOONS = 1000;

function isAuthorized(req: Request): boolean {
  return req.headers['x-admin-pass'] === process.env.API_ADMIN_PASS;
}

function unauthorized(res: Response) {
  return res.status(403).json({ error: 'Unauthorized admin request. Check x-admin-pass.' });
}

function shuffle<T>(values: T[]): T[] {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getActiveTournament() {
  return prisma.tournament.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' }
  });
}

async function ensureActiveTournament() {
  const active = await getActiveTournament();
  if (active) return active;

  const horses = await prisma.horse.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
  if (horses.length < 16) {
    throw new Error('At least 16 horses are required to start a tournament');
  }

  const horsePool = shuffle(horses.map((h) => h.id)).slice(0, 16);

  return prisma.tournament.create({
    data: {
      id: `tournament-${Date.now()}`,
      status: 'active',
      currentHeat: 1,
      horsePool,
      winners: []
    }
  });
}

async function getHeatHorseIds(tournament: { horsePool: unknown; currentHeat: number }) {
  const horsePool = Array.isArray(tournament.horsePool)
    ? tournament.horsePool.map((id) => Number(id)).filter((id) => Number.isInteger(id))
    : [];

  if (horsePool.length < 16) {
    throw new Error('Tournament horse pool is invalid');
  }

  if (tournament.currentHeat <= 4) {
    const offset = (tournament.currentHeat - 1) * 4;
    return horsePool.slice(offset, offset + 4);
  }

  const winners = await prisma.result.findMany({
    where: {
      race: {
        tournamentId: (tournament as any).id,
        heatNumber: { in: [1, 2, 3, 4] }
      },
      position: 1
    },
    orderBy: [{ raceId: 'asc' }],
    select: { horseId: true }
  });

  const unique = Array.from(new Set(winners.map((w) => w.horseId))).slice(0, 4);
  if (unique.length < 4) {
    throw new Error('Heat winners are not ready yet. Finish heats 1-4 first.');
  }

  return unique;
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

async function createRaceWithHorses(params: {
  tournamentId: string;
  heatNumber: number;
  raceName: string;
  raceType: 'heat' | 'final';
  horseIds: number[];
}) {
  const horses = await loadRaceHorses(params.horseIds);
  if (horses.length !== 4) throw new Error('Could not load four horses for race');

  const race = await prisma.race.create({
    data: {
      name: params.raceName,
      type: params.raceType,
      isFinal: params.heatNumber === 5,
      isTest: false,
      betsLocked: false,
      startedAt: null,
      endedAt: null,
      betClosesAt: null,
      tournamentId: params.tournamentId,
      heatNumber: params.heatNumber
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

  raceNamespace?.emit('race:init', {
    raceId: Number(race.id),
    raceName: params.raceName,
    horses,
    startAtPercent: 0
  });

  await patchSessionAndBroadcast({
    activeRaceId: race.id.toString(),
    tournamentId: params.tournamentId,
    heatNumber: Math.min(5, Math.max(1, params.heatNumber)) as 1 | 2 | 3 | 4 | 5,
    state: 'setup',
    selectedReplayRaceId: null,
    replayPaused: false
  }, 'admin');

  return { raceId: Number(race.id), horses };
}

router.get('/tournament-state', async (_req: Request, res: Response) => {
  try {
    const tournament = await ensureActiveTournament();
    const horsePoolIds = Array.isArray(tournament.horsePool)
      ? tournament.horsePool.map((id: any) => Number(id)).filter((id: number) => Number.isInteger(id))
      : [];

    const winnerHorseIds = await prisma.result.findMany({
      where: {
        race: {
          tournamentId: tournament.id,
          heatNumber: { in: [1, 2, 3, 4] }
        },
        position: 1
      },
      orderBy: { raceId: 'asc' },
      select: { horseId: true }
    });

    const horsePool = await loadRaceHorses(horsePoolIds);
    const winners = await loadRaceHorses(Array.from(new Set(winnerHorseIds.map((w) => w.horseId))).slice(0, 4));

    const activeRace = await prisma.race.findFirst({
      where: { endedAt: null },
      orderBy: { id: 'desc' },
      select: { id: true }
    });

    if (!activeRace) {
      const session = getRaceSession();
      const targetHeat = Math.min(5, Math.max(1, tournament.currentHeat)) as 1 | 2 | 3 | 4 | 5;
      const needsSync = session.state !== 'replaying'
        && (
          session.state !== 'setup'
          || session.activeRaceId !== null
          || session.tournamentId !== tournament.id
          || session.heatNumber !== targetHeat
        );

      if (needsSync) {
        await patchSessionAndBroadcast({
          activeRaceId: null,
          tournamentId: tournament.id,
          heatNumber: targetHeat,
          state: 'setup',
          selectedReplayRaceId: null,
          replayPaused: false
        }, 'server');
      }
    }

    res.json({
      success: true,
      tournamentId: tournament.id,
      horsePool,
      winners,
      heatNumber: tournament.currentHeat
    });
  } catch (err) {
    console.error('❌ Failed to fetch tournament state:', err);
    res.status(500).json({ error: 'Failed to fetch tournament state' });
  }
});

router.post('/clear-horses', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  raceHorseCache.clear();
  await patchSessionAndBroadcast({ state: 'cleared' }, 'admin');
  raceNamespace?.emit('admin:clear-stage');
  res.status(200).json({ message: '✅ Cleared race horses and stage' });
});

router.post('/reset-dev', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    await new Promise<void>((resolve, reject) => {
      exec('npx prisma db push --force-reset && npx tsx prisma/seed-dev.ts', (err, stdout) => {
        if (err) return reject(err);
        console.log('[KD] ✅ reset-dev output:\n', stdout);
        resolve();
      });
    });

    raceHorseCache.clear();
    await patchSessionAndBroadcast({
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
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    await new Promise<void>((resolve, reject) => {
      exec('npx prisma db push --force-reset && npx tsx prisma/seed.ts', (err, stdout) => {
        if (err) return reject(err);
        console.log('[KD] ✅ seed-reset output:\n', stdout);
        resolve();
      });
    });

    raceHorseCache.clear();
    await patchSessionAndBroadcast({
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
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    const tournament = await ensureActiveTournament();

    if (tournament.currentHeat > 5) {
      return res.status(400).json({ error: 'Tournament already completed. Reset races to start a new tournament.' });
    }

    const heatNumber = tournament.currentHeat;
    const horseIds = await getHeatHorseIds(tournament as any);
    const raceName = heatNumber < 5 ? `Heat ${heatNumber}` : 'Final Heat';
    const raceType = heatNumber < 5 ? 'heat' : 'final';

    const created = await createRaceWithHorses({
      tournamentId: tournament.id,
      heatNumber,
      raceName,
      raceType,
      horseIds
    });

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { currentHeat: Math.min(6, heatNumber + 1) }
    });

    res.status(200).json({
      success: true,
      message: `Race ${heatNumber} created`,
      raceId: created.raceId,
      raceName,
      horses: created.horses,
      tournamentId: tournament.id,
      heatNumber
    });
  } catch (err) {
    console.error('❌ Failed to generate race:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate race' });
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
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    await prisma.replayFrame.deleteMany();
    await prisma.result.deleteMany();
    await prisma.bet.deleteMany();
    await prisma.registration.deleteMany();
    await prisma.horsePath.deleteMany();
    await prisma.race.deleteMany();
    await prisma.tournament.updateMany({ data: { status: 'archived' } });

    raceHorseCache.clear();

    raceNamespace?.emit('admin:clear-stage');
    await patchSessionAndBroadcast({
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
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    const latest = await prisma.race.findFirst({ orderBy: { id: 'desc' }, select: { id: true, tournamentId: true, heatNumber: true } });
    if (!latest) return res.status(404).json({ error: 'No race found to start' });

    const horses = raceHorseCache.get(Number(latest.id));
    if (!horses || horses.length !== 4) {
      return res.status(400).json({ error: 'No cached horses found for this race. Generate race first.' });
    }

    await patchSessionAndBroadcast({
      activeRaceId: latest.id.toString(),
      tournamentId: latest.tournamentId,
      heatNumber: Math.min(5, Math.max(1, latest.heatNumber || 1)) as 1 | 2 | 3 | 4 | 5,
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
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    const latest = await prisma.race.findFirst({
      orderBy: { id: 'desc' },
      where: { endedAt: null },
      select: { id: true, tournamentId: true, heatNumber: true }
    });

    if (!latest) return res.status(404).json({ error: 'No active race found' });

    const seconds = parseInt(req.body.seconds || '60', 10);
    const betClosesAt = new Date(Date.now() + seconds * 1000);

    await prisma.race.update({
      where: { id: latest.id },
      data: { betClosesAt, betsLocked: false }
    });

    await patchSessionAndBroadcast({
      activeRaceId: latest.id.toString(),
      tournamentId: latest.tournamentId,
      heatNumber: Math.min(5, Math.max(1, latest.heatNumber || 1)) as 1 | 2 | 3 | 4 | 5,
      state: 'betting_open'
    }, 'admin');

    raceNamespace?.emit('admin:open-bets', { seconds, betClosesAt: betClosesAt.toISOString() });
    res.json({ success: true, message: `Bets are now open for ${seconds} seconds.` });
  } catch (err) {
    console.error('❌ Failed to open bets:', err);
    res.status(500).json({ error: 'Failed to open bets.' });
  }
});

router.post('/close-bets', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

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

    await patchSessionAndBroadcast({ state: 'betting_closed' }, 'admin');
    raceNamespace?.emit('admin:close-bets');
    res.json({ success: true, message: 'Bets are now closed.' });
  } catch (err) {
    console.error('❌ Failed to close bets:', err);
    res.status(500).json({ error: 'Failed to close bets.' });
  }
});

router.post('/replay/start', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const raceId = String(req.body.raceId || '').trim();
  if (!raceId || Number.isNaN(Number(raceId))) {
    return res.status(400).json({ error: 'Valid raceId is required' });
  }

  await beginReplayAndBroadcast(raceId, 'admin');
  res.json({ success: true, message: `Replay started for race ${raceId}` });
});

router.post('/replay/stop', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);
  await stopReplayAndBroadcast('admin');
  res.json({ success: true, message: 'Replay paused' });
});

router.post('/replay/clear', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);
  await clearReplayAndBroadcast('admin');
  res.json({ success: true, message: 'Replay cleared' });
});

router.get('/users', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
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

router.patch('/users/:userId', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid userId' });

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
    const updated = await prisma.user.update({ where: { id: userId }, data: updates });
    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('❌ Failed to update user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/users/:userId/add-loons', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const userId = Number(req.params.userId);
  const amount = Number(req.body.amount);
  if (!Number.isInteger(userId) || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Valid userId and amount required' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { leaseLoons: { increment: Math.trunc(amount) } }
    });

    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('❌ Failed to add loons:', err);
    res.status(500).json({ error: 'Failed to add loons' });
  }
});

router.delete('/users/:userId', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid userId' });

  try {
    await prisma.bet.deleteMany({ where: { userId } });
    await prisma.registration.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    raceNamespace?.emit('leaderboard:updated');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/reset-loons', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return unauthorized(res);

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

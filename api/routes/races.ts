// File: api/routes/races.ts
// Version: v2.0.0 — Uses canonical race summary fields for all clients
// Date: 2026-02-18

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { raceHorseCache } from './admin.js';
import { buildCanonicalRaceSummary } from '../lib/raceSummary.js';

const router = express.Router();

function horseSvg(bodyHex: string, saddleHex: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${bodyHex}"/><circle cx="47" cy="28" r="9" fill="${bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;
}

router.get('/races', async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: { endedAt: { not: null } },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        tournamentId: true,
        heatNumber: true,
        startedAt: true,
        endedAt: true,
        replay: { select: { id: true }, take: 1 }
      }
    });

    const payload = await Promise.all(races.map(async (race) => {
      const summary = await buildCanonicalRaceSummary(race.id);
      return {
        id: race.id.toString(),
        raceNumber: Number(race.id),
        name: race.name,
        tournamentId: race.tournamentId,
        heatNumber: race.heatNumber,
        startedAt: race.startedAt,
        endedAt: race.endedAt,
        replayDataLink: `/api/race/${race.id.toString()}/replay`,
        replayScreenLink: `/race?replayRaceId=${race.id.toString()}`,
        replayAvailable: race.replay.length > 0,
        winningHorse: summary.winningHorseName || '—',
        winningHorseMeta: summary.winningHorseName
          ? {
              bodyHex: summary.winningHorseBodyHex,
              saddleHex: summary.winningHorseSaddleHex
            }
          : null,
        winningPlayer: summary.topLoonWinner?.name || '—',
        loonWinners: summary.loonWinners
      };
    }));

    res.json(payload);
  } catch (err) {
    console.error('❌ [Race] Failed to fetch race list:', err);
    res.status(500).json({ error: 'Failed to fetch races' });
  }
});

router.get('/current', async (_req: Request, res: Response) => {
  try {
    const race = await prisma.race.findFirst({
      where: { endedAt: null },
      orderBy: { id: 'desc' },
      include: {
        results: { select: { id: true } },
        horsePaths: {
          select: {
            index: true,
            horse: {
              select: {
                id: true,
                name: true,
                bodyColor: true,
                bodyHex: true,
                saddleColor: true,
                saddleHex: true
              }
            }
          }
        }
      }
    });

    if (!race) {
      return res.status(200).json({ exists: false, horses: [] });
    }

    const now = new Date();
    const closesAt = race.betClosesAt;
    const locked = race.betsLocked || (closesAt ? now >= closesAt : false);

    if (!race.betsLocked && locked) {
      await prisma.race.update({
        where: { id: race.id },
        data: { betsLocked: true }
      });
    }

    let horses = race.horsePaths.map((hp) => ({
      id: hp.horse.id,
      name: hp.horse.name,
      bodyColor: hp.horse.bodyColor,
      bodyHex: hp.horse.bodyHex,
      saddleColor: hp.horse.saddleColor,
      saddleHex: hp.horse.saddleHex,
      localId: hp.index + 1
    }));

    if (horses.length === 0 && raceHorseCache.has(Number(race.id))) {
      horses = raceHorseCache.get(Number(race.id)) ?? [];
    }

    res.json({
      exists: true,
      id: race.id.toString(),
      name: race.name,
      tournamentId: race.tournamentId,
      heatNumber: race.heatNumber,
      startedAt: race.startedAt,
      endedAt: race.endedAt,
      betsLocked: locked,
      hasResults: race.results.length > 0,
      hasHorses: horses.length > 0,
      horses,
      countdownSeconds: !locked && closesAt
        ? Math.max(0, Math.floor((closesAt.getTime() - now.getTime()) / 1000))
        : 0
    });
  } catch (err) {
    console.error('❌ [Race] Failed to fetch current race:', err);
    res.status(500).json({ error: 'Failed to fetch current race' });
  }
});

router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const race = await prisma.race.findFirst({
      where: { isTest: false },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        tournamentId: true,
        heatNumber: true,
        startedAt: true,
        endedAt: true,
        betsLocked: true,
        results: { select: { id: true } },
        horsePaths: { select: { id: true } }
      }
    });

    if (!race) return res.status(200).json({ exists: false });

    const raceId = Number(race.id);
    const cachedHorses = raceHorseCache.get(raceId) ?? [];

    res.json({
      exists: true,
      id: race.id.toString(),
      name: race.name,
      tournamentId: race.tournamentId,
      heatNumber: race.heatNumber,
      startedAt: race.startedAt,
      endedAt: race.endedAt,
      betsLocked: race.betsLocked ?? false,
      hasResults: race.results.length > 0,
      hasHorses: race.horsePaths.length > 0 || cachedHorses.length > 0,
      horses: cachedHorses
    });
  } catch (err) {
    console.error('❌ [Race] Failed to fetch latest race:', err);
    res.status(500).json({ error: 'Failed to fetch latest race' });
  }
});

router.get('/:raceId/replay', async (req: Request, res: Response) => {
  const { raceId } = req.params;
  if (!raceId || Number.isNaN(Number(raceId))) {
    return res.status(400).json({ error: 'Invalid or missing raceId' });
  }

  try {
    const id = BigInt(raceId);
    const [frames, paths, summary] = await Promise.all([
      prisma.replayFrame.findMany({
        where: { raceId: id },
        select: { horseId: true, pct: true, timeMs: true },
        orderBy: { timeMs: 'asc' }
      }),
      prisma.horsePath.findMany({
        where: { raceId: id },
        orderBy: { index: 'asc' },
        select: {
          index: true,
          horse: { select: { id: true, name: true, bodyHex: true, saddleHex: true } }
        }
      }),
      buildCanonicalRaceSummary(id)
    ]);

    const horses = paths.map((p) => ({ ...p.horse, localId: p.index + 1 }));

    res.json({
      frames,
      horses,
      winner: summary.winningHorseId
        ? {
            horseId: summary.winningHorseId,
            horseName: summary.winningHorseName,
            bodyHex: summary.winningHorseBodyHex,
            saddleHex: summary.winningHorseSaddleHex
          }
        : null,
      loonWinners: summary.loonWinners
    });
  } catch (err) {
    console.error('❌ [Replay] Failed to fetch replay:', err);
    res.status(500).json({ error: 'Failed to fetch replay frames' });
  }
});

router.get('/latest-winner', async (_req: Request, res: Response) => {
  try {
    const latestRace = await prisma.race.findFirst({
      where: { endedAt: { not: null } },
      orderBy: { id: 'desc' },
      select: { id: true }
    });

    if (!latestRace) {
      return res.status(200).json({ success: true, winner: null });
    }

    const summary = await buildCanonicalRaceSummary(latestRace.id);

    if (!summary.winningHorseId) {
      return res.status(200).json({ success: true, winner: null });
    }

    return res.json({
      success: true,
      winner: {
        raceId: summary.raceId,
        bettorName: summary.topLoonWinner?.name || 'No winning bets',
        winnings: summary.topLoonWinner?.loons || 0,
        horseName: summary.winningHorseName,
        horseImage: `data:image/svg+xml;utf8,${encodeURIComponent(horseSvg(summary.winningHorseBodyHex || '#a0522d', summary.winningHorseSaddleHex || '#888888'))}`,
        bodyHex: summary.winningHorseBodyHex,
        saddleHex: summary.winningHorseSaddleHex
      }
    });
  } catch (err) {
    console.error('❌ [Race] Failed to fetch latest winner:', err);
    res.status(500).json({ error: 'Failed to fetch latest winner' });
  }
});

export default router;

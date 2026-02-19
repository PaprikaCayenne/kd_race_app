import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { buildCanonicalRaceSummary } from '../lib/raceSummary.js';

const router = express.Router();

router.get('/race/:raceId/replay', async (req: Request, res: Response) => {
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
    console.error('❌ [Replay] Failed to fetch frames:', err);
    res.status(500).json({ error: 'Failed to fetch replay frames' });
  }
});

router.get('/races', async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: { endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      select: { id: true, startedAt: true, name: true }
    });

    const formatted = races.map((r) => ({
      raceId: r.id.toString(),
      name: r.name
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ [Replay] Failed to fetch race list:', err);
    res.status(500).json({ error: 'Failed to fetch races' });
  }
});

export default router;

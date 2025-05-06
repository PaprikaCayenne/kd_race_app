// File: api/routes/races.ts
// Version: v0.2.1 — Cleaned, confirmed, and aligned with current race fetch logic

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/races
// Returns the 10 most recent races with formatted display names
router.get('/races', async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const response = races.map((race, index) => {
      const dateStr = format(race.startedAt ?? new Date(), 'MM-dd-yy hh:mm a');
      return {
        raceId: race.id.toString(),
        name: `Race: ${index + 1} (${dateStr})`,
      };
    });

    res.json(response);
  } catch (error) {
    console.error('❌ [API] Failed to fetch races:', error);
    res.status(500).json({ error: 'Failed to fetch races' });
  }
});

export default router;

// File: api/routes/bet.ts
// Version: v1.1.0 — Enforces server-side betting lock/countdown and race horse validation
// Date: 2026-02-18

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { patchSessionAndBroadcast } from '../sockets/race.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { deviceId, horseId, amount } = req.body;

  if (!deviceId || !Number.isInteger(Number(horseId)) || typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'deviceId, horseId, and amount >= 0 are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const race = await prisma.race.findFirst({
      where: { endedAt: null },
      orderBy: { id: 'desc' },
      include: {
        horsePaths: { select: { horseId: true } }
      }
    });

    if (!race) return res.status(400).json({ error: 'No active race available' });

    const now = new Date();
    const countdownExpired = Boolean(race.betClosesAt && now >= race.betClosesAt);
    const locked = race.betsLocked || countdownExpired;

    if (locked) {
      if (!race.betsLocked) {
        await prisma.race.update({ where: { id: race.id }, data: { betsLocked: true } });
        await patchSessionAndBroadcast({ state: 'betting_closed' }, 'server');
      }
      return res.status(403).json({ error: 'Betting is closed for this heat' });
    }

    const validHorseIds = new Set(race.horsePaths.map((hp) => hp.horseId));
    const normalizedHorseId = Number(horseId);
    if (!validHorseIds.has(normalizedHorseId)) {
      return res.status(400).json({ error: 'Horse is not part of the current race' });
    }

    const existingBet = await prisma.bet.findUnique({
      where: {
        userId_raceId_horseId: {
          userId: user.id,
          raceId: race.id,
          horseId: normalizedHorseId
        }
      }
    });

    const refund = existingBet?.amount || 0;
    const adjustedBalance = user.leaseLoons + refund;

    if (adjustedBalance < amount) {
      return res.status(400).json({ error: 'Insufficient Lease Loons' });
    }

    if (amount === 0 && existingBet) {
      await prisma.bet.delete({
        where: {
          userId_raceId_horseId: {
            userId: user.id,
            raceId: race.id,
            horseId: normalizedHorseId
          }
        }
      });
    } else if (amount > 0) {
      await prisma.bet.upsert({
        where: {
          userId_raceId_horseId: {
            userId: user.id,
            raceId: race.id,
            horseId: normalizedHorseId
          }
        },
        update: { amount },
        create: {
          userId: user.id,
          raceId: race.id,
          horseId: normalizedHorseId,
          amount
        }
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { leaseLoons: adjustedBalance - amount }
    });

    res.json({ success: true, newBalance: adjustedBalance - amount });
  } catch (err) {
    console.error('Betting error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

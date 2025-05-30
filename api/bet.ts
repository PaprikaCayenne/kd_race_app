// File: api/routes/bet.ts
// Version: v1.1.0 — Supports multi-horse betting with lock and balance validation

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// POST /api/bet — upsert a bet for one horse in the current race
router.post("/", async (req: Request, res: Response) => {
  const { deviceId, horseId, amount } = req.body;

  if (!deviceId || !horseId || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (amount < 0 || amount % 50 !== 0) {
    return res.status(400).json({ error: "Amount must be in 50 LL increments" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const race = await prisma.race.findFirst({
      where: { locked: false },
      orderBy: { id: "desc" }
    });

    if (!race || (race.betClosesAt && new Date() >= race.betClosesAt)) {
      return res.status(403).json({ error: "Betting is closed" });
    }

    const existingBet = await prisma.bet.findUnique({
      where: {
        userId_raceId_horseId: {
          userId: user.id,
          raceId: race.id,
          horseId
        }
      }
    });

    const oldAmount = existingBet?.amount || 0;
    const refund = oldAmount;
    const availableBalance = user.leaseLoons + refund;

    if (amount > availableBalance) {
      return res.status(400).json({ error: "Insufficient Lease Loons" });
    }

    // Upsert the bet
    await prisma.bet.upsert({
      where: {
        userId_raceId_horseId: {
          userId: user.id,
          raceId: race.id,
          horseId
        }
      },
      update: { amount },
      create: {
        userId: user.id,
        raceId: race.id,
        horseId,
        amount
      }
    });

    // Update user leaseLoons
    const newBalance = availableBalance - amount;
    await prisma.user.update({
      where: { id: user.id },
      data: { leaseLoons: newBalance }
    });

    res.json({ success: true, newBalance });
  } catch (err) {
    console.error("❌ Betting error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

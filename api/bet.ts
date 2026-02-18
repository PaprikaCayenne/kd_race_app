// File: api/bet.ts
// Version: v1.1.1 — Align imports/types with API codebase

import express, { Request, Response } from "express";
import prisma from "./lib/prisma";

const router = express.Router();

// POST /api/bet
router.post("/", async (req: Request, res: Response) => {
  const { deviceId, horseId, amount } = req.body;

  if (!deviceId || !horseId || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "deviceId, horseId, and amount > 0 are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const race = await prisma.race.findFirst({
      where: { betsLocked: false },
      orderBy: { id: "desc" }
    });
    if (!race) return res.status(400).json({ error: "No active race available" });

    const existingBet = await prisma.bet.findUnique({
      where: {
        userId_raceId_horseId: {
          userId: user.id,
          raceId: race.id,
          horseId
        }
      }
    });

    const refund = existingBet?.amount || 0;
    const adjustedBalance = user.leaseLoons + refund;

    if (adjustedBalance < amount) {
      return res.status(400).json({ error: "Insufficient Lease Loons" });
    }

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

    await prisma.user.update({
      where: { id: user.id },
      data: { leaseLoons: adjustedBalance - amount }
    });

    res.json({ success: true, newBalance: adjustedBalance - amount });
  } catch (err) {
    console.error("Betting error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

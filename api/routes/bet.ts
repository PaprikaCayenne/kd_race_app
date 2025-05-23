// File: api/routes/bet.ts
// Version: v1.0.0 — Submit or update a bet for the active race

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

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
      where: { locked: false },
      orderBy: { id: "desc" }
    });
    if (!race) return res.status(400).json({ error: "No active race available" });

    const existingBet = await prisma.bet.findUnique({
      where: {
        userId_raceId: {
          userId: user.id,
          raceId: race.id
        }
      }
    });

    const refund = existingBet?.amount || 0;
    const adjustedBalance = user.currency + refund;

    if (adjustedBalance < amount) {
      return res.status(400).json({ error: "Insufficient Lease Loons" });
    }

    // Upsert bet
    await prisma.bet.upsert({
      where: {
        userId_raceId: {
          userId: user.id,
          raceId: race.id
        }
      },
      update: { horseId, amount },
      create: {
        userId: user.id,
        raceId: race.id,
        horseId,
        amount
      }
    });

    // Update user balance
    await prisma.user.update({
      where: { id: user.id },
      data: { currency: adjustedBalance - amount }
    });

    res.json({ success: true, newBalance: adjustedBalance - amount });
  } catch (err) {
    console.error("Betting error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

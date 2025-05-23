// File: api/routes/user.ts
// Version: v1.0.0 — Returns user info and current bet

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

router.get("/:deviceId", async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { deviceId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the most recent unlocked race
    const race = await prisma.race.findFirst({
      where: { locked: false },
      orderBy: { id: "desc" }
    });

    // If there's a race, look for a bet
    let bet = null;
    if (race) {
      bet = await prisma.bet.findUnique({
        where: {
          userId_raceId: {
            userId: user.id,
            raceId: race.id
          }
        },
        select: {
          raceId: true,
          horseId: true,
          amount: true
        }
      });
    }

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      currency: user.currency,
      bet: bet || null
    });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

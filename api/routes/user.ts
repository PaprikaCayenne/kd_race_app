// File: api/routes/user.ts  
// Version: v1.1.9 — Converts all BigInts in user response  
// Date: 2025-05-29

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// ✅ Place specific route first
router.get("/all", async (req: Request, res: Response) => {
  const token = req.headers["x-admin-pass"];
  if (token !== process.env.API_ADMIN_PASS) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        deviceId: true,
        firstName: true,
        lastName: true,
        nickname: true,
        leaseLoons: true
      }
    });

    res.json(users);
  } catch (err) {
    console.error("User list fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🧭 Place generic route second to avoid shadowing
router.get("/:deviceId", async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        deviceId: {
          equals: deviceId,
          mode: "insensitive"
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = Number(user.id); // ✅ Convert once

    const race = await prisma.race.findFirst({
      where: { betsLocked: false },
      orderBy: { id: "desc" }
    });

    let bets = [];
    if (race) {
      bets = await prisma.bet.findMany({
        where: {
          userId,
          raceId: race.id
        },
        select: {
          raceId: true,
          horseId: true,
          amount: true
        }
      });

      // ✅ Fix BigInt in raceId
      bets = bets.map((bet) => ({
        raceId: Number(bet.raceId),
        horseId: bet.horseId,
        amount: bet.amount
      }));
    }

    res.json({
      id: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      leaseLoons: user.leaseLoons,
      bets
    });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

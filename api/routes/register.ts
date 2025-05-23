// File: api/routes/register.ts
// Version: v0.3.1 — Sets starting Lease Loons via configurable constant

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// 💰 Starting Lease Loons for all new users
const STARTING_CURRENCY = 1000;

router.post("/", async (req: Request, res: Response) => {
  const { firstName, lastName, nickname, horseId, deviceId } = req.body;

  if (!firstName || !lastName || !deviceId) {
    return res.status(400).json({
      error: "firstName, lastName, and deviceId are required",
    });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { deviceId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          nickname: nickname || null,
          deviceId,
          currency: STARTING_CURRENCY
        },
      });

      // Optional: register to a horse if provided
      if (horseId) {
        await prisma.registration.create({
          data: {
            userId: user.id,
            horseId,
          },
        });
      }
    }

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      currency: user.currency,
      deviceId: user.deviceId
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

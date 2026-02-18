import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const latestRace = await prisma.race.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });

    if (latestRace) {
      const active = await prisma.horsePath.findMany({
        where: { raceId: latestRace.id },
        orderBy: { index: 'asc' },
        select: {
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
      });

      if (active.length > 0) {
        return res.json(active.map((row) => row.horse));
      }
    }

    const horses = await prisma.horse.findMany({
      orderBy: { id: "asc" },
      take: 16
    });

    res.json(horses);
  } catch (error) {
    console.error("❌ Error fetching horses:", error);
    res.status(500).json({ error: "Failed to fetch horses" });
  }
});

export default router;

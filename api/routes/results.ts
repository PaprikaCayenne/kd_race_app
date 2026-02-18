// File: api/routes/results.ts
// Version: v0.2.0 – Use Prisma instead of legacy db pool

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// GET /api/race/:raceId/results → Fetch race result leaderboard
router.get("/:raceId/results", async (req: Request, res: Response) => {
  const raceId = Number(req.params.raceId);

  if (!Number.isInteger(raceId)) {
    return res.status(400).json({ error: "Invalid race ID" });
  }

  try {
    const rows = await prisma.result.findMany({
      where: { raceId: BigInt(raceId) },
      orderBy: { position: "asc" },
      select: {
        position: true,
        timeMs: true,
        horse: {
          select: {
            id: true,
            name: true,
            bodyHex: true
          }
        }
      }
    });

    const payload = rows.map((row) => ({
      position: row.position,
      time_ms: row.timeMs,
      horse_id: row.horse.id,
      name: row.horse.name,
      color: row.horse.bodyHex
    }));

    res.json(payload);
  } catch (err) {
    console.error("❌ Error fetching race results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

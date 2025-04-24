// File: api/routes/replay.js
// Version: v0.7.2 – Add /api/races list for dropdown menu

import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/race/:raceId/replay — Returns all tick frames for a race
router.get("/race/:raceId/replay", async (req, res) => {
  const { raceId } = req.params;

  if (!raceId || isNaN(Number(raceId))) {
    return res.status(400).json({ error: "Invalid or missing raceId" });
  }

  try {
    const frames = await prisma.replayFrame.findMany({
      where: { raceId: BigInt(raceId) },
      select: {
        horseId: true,
        pct: true,
        timeMs: true
      },
      orderBy: { timeMs: "asc" }
    });

    res.json({ frames });
  } catch (err) {
    console.error("❌ [Replay] Failed to fetch frames:", err);
    res.status(500).json({ error: "Failed to fetch replay frames" });
  }
});

// GET /api/races — Returns metadata for available replays
router.get("/races", async (req, res) => {
  try {
    const races = await prisma.race.findMany({
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        startedAt: true
      }
    });

    const formatted = races.map((r, idx) => {
      const date = new Date(r.startedAt);
      const name = `Race: ${races.length - idx} – ${date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })}`;
      return { raceId: r.id.toString(), name };
    });

    res.json(formatted);
  } catch (err) {
    console.error("❌ [Replay] Failed to fetch race list:", err);
    res.status(500).json({ error: "Failed to fetch races" });
  }
});

export default router;

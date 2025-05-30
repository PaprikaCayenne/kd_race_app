// File: api/routes/races.ts
// Version: v1.8.0 — Adds accurate /admin/save-results fallback with full Result model
// Date: 2025-05-29

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";
import { raceHorseCache } from "./admin";

const router = express.Router();

// ✅ GET /api/races — Returns metadata for available replays
router.get("/races", async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true }
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

// ✅ FIXED: /api/race/current returns same structure as /latest
router.get("/current", async (_req: Request, res: Response) => {
  try {
    const race = await prisma.race.findFirst({
      where: { betsLocked: false },
      orderBy: { id: "desc" },
      include: {
        results: { select: { id: true } },
        horsePaths: {
          select: {
            index: true,
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
        }
      }
    });

    if (!race) {
      return res.status(200).json({ exists: false, horses: [] });
    }

    const now = new Date();
    const closesAt = race.betClosesAt;
    const locked = closesAt ? now >= closesAt : false;

    let horses = race.horsePaths.map(hp => ({
      id: hp.horse.id,
      name: hp.horse.name,
      bodyColor: hp.horse.bodyColor,
      bodyHex: hp.horse.bodyHex,
      saddleColor: hp.horse.saddleColor,
      saddleHex: hp.horse.saddleHex,
      localId: hp.index + 1
    }));

    // Fallback to raceHorseCache if DB paths are empty
    if (horses.length === 0 && raceHorseCache.has(Number(race.id))) {
      horses = raceHorseCache.get(Number(race.id));
    }

    res.json({
      exists: true,
      id: race.id.toString(),
      name: race.name,
      startedAt: race.startedAt,
      endedAt: race.endedAt,
      betsLocked: locked,
      hasResults: race.results.length > 0,
      hasHorses: horses.length > 0,
      horses,
      countdownSeconds: !locked && closesAt
        ? Math.max(0, Math.floor((closesAt.getTime() - now.getTime()) / 1000))
        : 0
    });
  } catch (err) {
    console.error("❌ [Race] Failed to fetch current race:", err);
    res.status(500).json({ error: "Failed to fetch current race" });
  }
});

// ✅ GET /api/race/latest — Returns latest race status and metadata for Admin Panel
router.get("/latest", async (_req: Request, res: Response) => {
  try {
    const race = await prisma.race.findFirst({
      where: { isTest: false },
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        endedAt: true,
        betsLocked: true,
        results: { select: { id: true } },
        horsePaths: { select: { id: true } }
      }
    });

    if (!race) {
      return res.status(200).json({ exists: false });
    }

    const raceId = Number(race.id);
    const hasLiveHorses = raceHorseCache.has(raceId) && raceHorseCache.get(raceId)?.length >= 4;
    const hasHorses = race.horsePaths.length > 0 || hasLiveHorses;

    const horses = raceHorseCache.get(raceId) || [];

    res.json({
      exists: true,
      id: race.id.toString(),
      name: race.name,
      startedAt: race.startedAt,
      endedAt: race.endedAt,
      betsLocked: race.betsLocked ?? false,
      hasResults: race.results.length > 0,
      hasHorses,
      horses
    });
  } catch (err) {
    console.error("❌ [Race] Failed to fetch latest race:", err);
    res.status(500).json({ error: "Failed to fetch latest race" });
  }
});

// ✅ GET /api/race/:raceId/replay — Returns all tick frames for a race
router.get("/:raceId/replay", async (req: Request, res: Response) => {
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

// ✅ POST /api/admin/save-results — fallback for playRace.js if socket fails
router.post("/admin/save-results", async (req: Request, res: Response) => {
  const { raceId, leaderboard } = req.body;

  if (!raceId || !Array.isArray(leaderboard)) {
    return res.status(400).json({ error: "Missing raceId or leaderboard" });
  }

  try {
    const insertData = leaderboard.map((r: any, i: number) => ({
      raceId: BigInt(raceId),
      horseId: r.horseId,
      localId: r.localId ?? -1,
      position: r.position ?? i + 1,
      timeMs: r.timeMs
    }));

    await prisma.result.createMany({ data: insertData });
    await prisma.race.update({ where: { id: BigInt(raceId) }, data: { endedAt: new Date() } });

    console.log(`[KD] ✅ Fallback results saved for race ${raceId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ [Fallback] Failed to save race results:", err);
    res.status(500).json({ error: "Failed to save results" });
  }
});

export default router;

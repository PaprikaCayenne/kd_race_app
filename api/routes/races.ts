// File: api/routes/races.ts
// Version: v1.8.0 — Adds accurate /admin/save-results fallback with full Result model
// Date: 2025-05-29

import express, { Request, Response } from "express";
import prisma from "../lib/prisma";
import { raceHorseCache } from "./admin";

const router = express.Router();

// ✅ GET /api/race/races — Returns race metadata with replay + winner/loon-winner summary for admin
router.get("/races", async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: { endedAt: { not: null } },
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        endedAt: true,
        replay: {
          select: { id: true },
          take: 1
        },
        results: {
          where: { position: { lte: 3 } },
          orderBy: { position: "asc" },
          select: {
            horseId: true,
            position: true,
            horse: {
              select: {
                name: true,
                bodyHex: true,
                saddleHex: true
              }
            }
          }
        },
        bets: {
          select: {
            amount: true,
            horseId: true,
            user: {
              select: {
                nickname: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    const payload = races.map((race) => {
      const winner = race.results.find((result) => result.position === 1) ?? null;
      const multiplierByHorse = new Map<number, number>();
      race.results.forEach((result) => {
        if (result.position === 1) multiplierByHorse.set(result.horseId, 3);
        else if (result.position === 2) multiplierByHorse.set(result.horseId, 2);
        else if (result.position === 3) multiplierByHorse.set(result.horseId, 1.5);
      });

      const winningsByPlayer = new Map<string, number>();
      race.bets.forEach((bet) => {
        const multiplier = multiplierByHorse.get(bet.horseId);
        if (!multiplier) return;

        const playerName = bet.user.nickname
          || [bet.user.firstName, bet.user.lastName].filter(Boolean).join(' ')
          || 'Unknown Player';

        const winnings = Math.floor(bet.amount * multiplier);
        winningsByPlayer.set(playerName, (winningsByPlayer.get(playerName) || 0) + winnings);
      });

      const loonWinners = Array.from(winningsByPlayer.entries())
        .map(([name, loons]) => ({ name, loons }))
        .sort((a, b) => b.loons - a.loons)
        .map((entry, idx) => ({ ...entry, isTop: idx === 0 }));

      return {
        id: race.id.toString(),
        raceNumber: Number(race.id),
        name: race.name,
        startedAt: race.startedAt,
        endedAt: race.endedAt,
        replayDataLink: `/api/race/${race.id.toString()}/replay`,
        replayScreenLink: `/race?replayRaceId=${race.id.toString()}`,
        replayAvailable: race.replay.length > 0,
        winningHorse: winner?.horse?.name || '—',
        winningHorseMeta: winner ? {
          bodyHex: winner.horse.bodyHex,
          saddleHex: winner.horse.saddleHex
        } : null,
        winningPlayer: loonWinners[0]?.name || '—',
        loonWinners
      };
    });

    res.json(payload);
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

    let horses: Array<{
      id: number;
      name: string;
      bodyColor: string;
      bodyHex: string;
      saddleColor: string;
      saddleHex: string;
      localId: number;
    }> = race.horsePaths.map(hp => ({
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
      horses = raceHorseCache.get(Number(race.id)) ?? [];
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
    const cachedHorses = raceHorseCache.get(raceId) ?? [];
    const hasLiveHorses = cachedHorses.length >= 4;
    const hasHorses = race.horsePaths.length > 0 || hasLiveHorses;

    const horses = cachedHorses;

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
  const { raceId, leaderboard, results, replayFrames = [] } = req.body;
  const normalizedResults = Array.isArray(results) && results.length > 0 ? results : leaderboard;

  if (!raceId || !Array.isArray(normalizedResults)) {
    return res.status(400).json({ error: "Missing raceId or results" });
  }

  try {
    const insertData = normalizedResults.map((r: any, i: number) => ({
      raceId: BigInt(raceId),
      horseId: r.horseId,
      localId: r.localId ?? -1,
      position: r.position ?? i + 1,
      timeMs: r.timeMs
    }));

    await prisma.result.createMany({ data: insertData });

    if (Array.isArray(replayFrames) && replayFrames.length > 0) {
      const replayRows = replayFrames
        .map((frame: any) => ({
          raceId: BigInt(raceId),
          horseId: Number(frame.horseId),
          pct: Math.max(0, Math.min(1, Number(frame.pct) || 0)),
          timeMs: Number(frame.timeMs) || 0
        }))
        .filter((frame: any) => Number.isInteger(frame.horseId));

      if (replayRows.length > 0) {
        await prisma.replayFrame.createMany({ data: replayRows });
      }
    }

    await prisma.race.update({ where: { id: BigInt(raceId) }, data: { endedAt: new Date() } });

    console.log(`[KD] ✅ Fallback results saved for race ${raceId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ [Fallback] Failed to save race results:", err);
    res.status(500).json({ error: "Failed to save results" });
  }
});


// ✅ GET /api/race/latest-winner — winner card data for projector
router.get('/latest-winner', async (_req: Request, res: Response) => {
  try {
    const latestRace = await prisma.race.findFirst({
      where: { endedAt: { not: null } },
      orderBy: { id: 'desc' },
      select: { id: true }
    });

    if (!latestRace) {
      return res.status(200).json({ success: true, winner: null });
    }

    const winnerResult = await prisma.result.findFirst({
      where: { raceId: latestRace.id, position: 1 },
      select: {
        horse: {
          select: {
            name: true,
            bodyHex: true,
            saddleHex: true
          }
        },
        horseId: true
      }
    });

    if (!winnerResult) {
      return res.status(200).json({ success: true, winner: null });
    }

    const winnerBets = await prisma.bet.findMany({
      where: { raceId: latestRace.id, horseId: winnerResult.horseId },
      include: { user: { select: { nickname: true, firstName: true, lastName: true } } },
      orderBy: { amount: 'desc' }
    });

    const topBet = winnerBets[0] ?? null;
    const bettorName = topBet
      ? (topBet.user?.nickname || [topBet.user?.firstName, topBet.user?.lastName].filter(Boolean).join(' ') || 'Unknown bettor')
      : 'No bets placed';
    const winnings = topBet ? topBet.amount * 3 : 0;

    const horseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${winnerResult.horse.bodyHex}"/><circle cx="47" cy="28" r="9" fill="${winnerResult.horse.bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${winnerResult.horse.saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;

    return res.json({
      success: true,
      winner: {
        raceId: latestRace.id.toString(),
        bettorName,
        winnings,
        horseName: winnerResult.horse.name,
        horseImage: `data:image/svg+xml;utf8,${encodeURIComponent(horseSvg)}`,
        bodyHex: winnerResult.horse.bodyHex,
        saddleHex: winnerResult.horse.saddleHex
      }
    });
  } catch (err) {
    console.error('❌ [Race] Failed to fetch latest winner:', err);
    res.status(500).json({ error: 'Failed to fetch latest winner' });
  }
});

export default router;

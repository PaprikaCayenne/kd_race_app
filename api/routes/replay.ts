import express, { Request, Response } from "express";
import prisma from "../lib/prisma";

const router = express.Router();

// GET /api/race/:raceId/replay
router.get("/race/:raceId/replay", async (req: Request, res: Response) => {
  const { raceId } = req.params;

  if (!raceId || isNaN(Number(raceId))) {
    return res.status(400).json({ error: "Invalid or missing raceId" });
  }

  try {
    const id = BigInt(raceId);
    const [frames, paths, winnerResult, bets] = await Promise.all([
      prisma.replayFrame.findMany({
        where: { raceId: id },
        select: { horseId: true, pct: true, timeMs: true },
        orderBy: { timeMs: "asc" }
      }),
      prisma.horsePath.findMany({
        where: { raceId: id },
        orderBy: { index: "asc" },
        select: {
          index: true,
          horse: { select: { id: true, name: true, bodyHex: true, saddleHex: true } }
        }
      }),
      prisma.result.findFirst({
        where: { raceId: id, position: 1 },
        select: {
          horseId: true,
          horse: { select: { name: true, bodyHex: true, saddleHex: true } }
        }
      }),
      prisma.bet.findMany({
        where: { raceId: id },
        select: {
          amount: true,
          horseId: true,
          user: { select: { nickname: true, firstName: true, lastName: true } }
        }
      })
    ]);

    const horses = paths.map((p) => ({ ...p.horse, localId: p.index + 1 }));


    const loonWinners = bets.length === 0
      ? []
      : bets
          .map((bet) => ({
            name: bet.user.nickname || [bet.user.firstName, bet.user.lastName].filter(Boolean).join(' ') || 'Unknown',
            loons: winnerResult && bet.horseId === winnerResult.horseId ? bet.amount * 3 : 0
          }))
          .filter((entry) => entry.loons > 0)
          .sort((a, b) => b.loons - a.loons);

    res.json({
      frames,
      horses,
      winner: winnerResult
        ? {
            horseId: winnerResult.horseId,
            horseName: winnerResult.horse.name,
            bodyHex: winnerResult.horse.bodyHex,
            saddleHex: winnerResult.horse.saddleHex
          }
        : null,
      loonWinners
    });
  } catch (err) {
    console.error("❌ [Replay] Failed to fetch frames:", err);
    res.status(500).json({ error: "Failed to fetch replay frames" });
  }
});

router.get("/races", async (_req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true }
    });

    const formatted = races.map((r, idx) => {
      const date = r.startedAt ? new Date(r.startedAt) : new Date();
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

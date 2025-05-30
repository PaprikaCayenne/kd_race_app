// File: api/routes/admin.ts
// Version: v2.11.0 — Adds /admin/reset-dev to run prisma/seed-dev.ts
// Date: 2025-05-29

// ... all imports remain unchanged
import express, { Request, Response } from "express";
import { exec } from "child_process";
import prisma from "../lib/prisma.js";
import { raceNamespace } from "../sockets/race.js";

const router = express.Router();
export const raceHorseCache = new Map<number, any[]>(); // Map<raceId, horsesWithLocalId[]>

function isAuthorized(req: Request): boolean {
  return req.headers["x-admin-pass"] === process.env.API_ADMIN_PASS;
}

// ✅ POST /api/admin/clear-horses — Clears raceHorseCache (in-memory)
router.post("/clear-horses", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    raceHorseCache.clear();
    res.status(200).json({ message: "✅ Cleared raceHorseCache" });
  } catch (err) {
    console.error("❌ Failed to clear raceHorseCache:", err);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// ✅ NEW: POST /admin/reset-dev — Force reset DB and re-seed from prisma/seed-dev.ts
router.post("/reset-dev", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    await new Promise<void>((resolve, reject) => {
      exec("npx prisma db push --force-reset && npx tsx prisma/seed-dev.ts", (err, stdout, stderr) => {
        if (err) {
          console.error("[KD] ❌ reset-dev error:", err);
          return reject(err);
        }
        console.log("[KD] ✅ reset-dev output:\n", stdout);
        resolve();
      });
    });

    res.status(200).json({ message: "✅ Database reset using seed-dev.ts" });
  } catch (err) {
    console.error("[KD] ❌ Failed to reset database (dev):", err);
    res.status(500).json({ error: "Failed to run reset-dev", detail: err.message });
  }
});

// ✅ NEW: POST /admin/seed-reset — Force reset DB and re-seed from prisma/seed.ts
router.post("/seed-reset", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    await new Promise<void>((resolve, reject) => {
      exec("npx prisma db push --force-reset && npx tsx prisma/seed.ts", (err, stdout, stderr) => {
        if (err) {
          console.error("[KD] ❌ seed-reset error:", err);
          return reject(err);
        }
        console.log("[KD] ✅ seed-reset output:\n", stdout);
        resolve();
      });
    });

    res.status(200).json({ message: "✅ Database reset using seed.ts" });
  } catch (err) {
    console.error("[KD] ❌ Failed to reset database:", err);
    res.status(500).json({ error: "Failed to run seed-reset", detail: err.message });
  }
});

// ... (all other routes unchanged — you can paste them below here)


async function getRandomUnusedRaceName(): Promise<string> {
  const unused = await prisma.raceName.findMany({
    where: {
      used: false,
      name: { not: "Gallop Gala" } // ⛔ exclude Gallop Gala from random picks
    }
  });
  if (unused.length === 0) throw new Error("No unused race names available");

  const chosen = unused[Math.floor(Math.random() * unused.length)];
  await prisma.raceName.update({ where: { id: chosen.id }, data: { used: true } });
  return chosen.name;
}

async function get4RandomUnusedHorses(): Promise<any[]> {
  const usedHorseIds = await prisma.result.findMany({ select: { horseId: true } });
  const usedIds = new Set(usedHorseIds.map(r => r.horseId));
  const allHorses = await prisma.horse.findMany();
  const unused = allHorses.filter(h => !usedIds.has(h.id));
  if (unused.length < 4) return [];
  const shuffled = unused.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4);
}

// POST /generate-race
router.post("/generate-race", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const name = await getRandomUnusedRaceName();
    const base = await get4RandomUnusedHorses();
    if (base.length < 4) {
      return res.status(400).json({ error: "Not enough unused horses available" });
    }

    const ids = base.map(h => h.id);
    const selected = await prisma.horse.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        bodyColor: true,
        bodyHex: true,
        saddleColor: true,
        saddleHex: true
      }
    });

    const withLocalIds = selected.map((h, i) => ({ ...h, localId: i + 1 }));

    const race = await prisma.race.create({
      data: {
        name,
        type: "heat",
        isFinal: false,
        isTest: false
      }
    });

    raceHorseCache.set(Number(race.id), withLocalIds);

    raceNamespace.emit("race:init", {
      raceId: Number(race.id),
      horses: withLocalIds,
      startAtPercent: 0
    });

    res.status(200).json({
      message: "Race created and cached",
      raceId: Number(race.id),
      raceName: name,
      horses: withLocalIds
    });
  } catch (err) {
    console.error("❌ Error creating race:", err);
    res.status(500).json({ error: "Failed to create race", detail: err.message });
  }
});

// GET /leaderboard
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { leaseLoons: "desc" },
      select: {
        id: true,
        nickname: true,
        leaseLoons: true
      }
    });

    res.json({ success: true, leaderboard: users });
  } catch (err) {
    console.error("❌ Failed to fetch leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// POST /api/admin/reset-tournament
router.post("/reset-tournament", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    await prisma.result.deleteMany();
    await prisma.race.deleteMany();
    await prisma.raceName.updateMany({ data: { used: false } });

    // 🧹 Emit signal to frontend to clear visuals
    raceNamespace.emit("admin:clear-stage");

    res.status(200).json({ message: "✅ Tournament reset complete" });
  } catch (err) {
    console.error("❌ Failed to reset tournament:", err);
    res.status(500).json({ error: "Failed to reset tournament" });
  }
});

// POST /start-race
router.post("/start-race", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const latest = await prisma.race.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    if (!latest) return res.status(404).json({ error: "No race found to start" });

    const horses = raceHorseCache.get(Number(latest.id));
    if (!horses || horses.length !== 4) {
      return res.status(400).json({ error: "No cached horses found for this race. Generate race first." });
    }

    raceNamespace.emit("admin:start-race", {
      raceId: Number(latest.id),
      horses
    });

    res.status(200).json({ message: "Race started", raceId: Number(latest.id) });
  } catch (err) {
    console.error("❌ Failed to start race:", err);
    res.status(500).json({ error: "Failed to start race" });
  }
});

// POST /save-results
router.post("/save-results", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  const { raceId, results } = req.body;

  if (!raceId || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "Missing raceId or results" });
  }

  try {
    // 1. Save Results
    const insertData = results.map((r: any) => ({
      raceId: BigInt(raceId),
      horseId: r.horseId,
      position: r.position,
      timeMs: r.timeMs,
      localId: r.localId
    }));

    await prisma.result.createMany({ data: insertData });

    await prisma.race.update({
      where: { id: BigInt(raceId) },
      data: { endedAt: new Date() }
    });

    // 2. Apply Lease Loons Payouts
    const bets = await prisma.bet.findMany({ where: { raceId: BigInt(raceId) } });
    const winners = new Map<number, number>(); // horseId → multiplier

    results.forEach((r: any) => {
      if (r.position === 1) winners.set(r.horseId, 3);
      else if (r.position === 2) winners.set(r.horseId, 2);
      else if (r.position === 3) winners.set(r.horseId, 1.5);
    });

    const payoutsByUser = new Map<number, number>();

    for (const bet of bets) {
      const multiplier = winners.get(bet.horseId);
      if (!multiplier) continue;

      const winnings = Math.floor(bet.amount * multiplier);
      payoutsByUser.set(bet.userId, (payoutsByUser.get(bet.userId) || 0) + winnings);
    }

    const payoutOps = Array.from(payoutsByUser.entries()).map(([userId, totalWinnings]) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          leaseLoons: { increment: totalWinnings }
        }
      })
    );

    await Promise.all(payoutOps);

    console.log(`[KD] ✅ Saved results and paid out ${payoutOps.length} users`);
    res.json({ success: true, message: "Results saved and payouts applied" });
  } catch (err) {
    console.error("❌ Failed to save race results:", err);
    res.status(500).json({ error: "Failed to save race results" });
  }
});

// POST /api/admin/reset-tournament
router.post("/reset-tournament", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    await prisma.result.deleteMany();
    await prisma.race.deleteMany();
    await prisma.raceName.updateMany({ data: { used: false } });

    res.status(200).json({ message: "✅ Tournament reset complete" });
  } catch (err) {
    console.error("❌ Failed to reset tournament:", err);
    res.status(500).json({ error: "Failed to reset tournament" });
  }
});


// POST /open-bets
router.post("/open-bets", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const latest = await prisma.race.findFirst({
      orderBy: { id: "desc" },
      where: { endedAt: null, betsLocked: false },
      select: { id: true }
    });

    if (!latest) return res.status(404).json({ error: "No active race found" });

    const seconds = parseInt(req.body.seconds || "60", 10);
    const betClosesAt = new Date(Date.now() + seconds * 1000);

    await prisma.race.update({
      where: { id: latest.id },
      data: {
        betClosesAt,
        betsLocked: false
      }
    });

    raceNamespace.emit("admin:open-bets");
    res.json({ success: true, message: `Bets are now open for ${seconds} seconds.` });
  } catch (err) {
    console.error("❌ Failed to open bets:", err);
    res.status(500).json({ error: "Failed to open bets." });
  }
});

// POST /close-bets
router.post("/close-bets", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const latest = await prisma.race.findFirst({
      orderBy: { id: "desc" },
      where: { endedAt: null },
      select: { id: true }
    });

    if (!latest) return res.status(404).json({ error: "No active race found" });

    await prisma.race.update({
      where: { id: latest.id },
      data: {
        betClosesAt: new Date(),
        betsLocked: true
      }
    });

    raceNamespace.emit("admin:close-bets");
    res.json({ success: true, message: "Bets are now closed." });
  } catch (err) {
    console.error("❌ Failed to close bets:", err);
    res.status(500).json({ error: "Failed to close bets." });
  }
});

// POST /admin/final-race
router.post("/final-race", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) return res.status(403).json({ error: "Unauthorized" });

  try {
    const topResults = await prisma.result.findMany({
      orderBy: { timeMs: "asc" },
      take: 4,
      distinct: ["horseId"],
      include: { horse: true }
    });

    if (topResults.length < 4) {
      return res.status(400).json({ error: "Not enough unique horses from previous races" });
    }

    const finalRace = await prisma.race.create({
      data: {
        name: "Gallop Gala",
        type: "final",
        isFinal: true,
        isTest: false
      }
    });

    const horses = topResults.map((r, i) => ({
      id: r.horse.id,
      name: r.horse.name,
      bodyColor: r.horse.bodyColor,
      bodyHex: r.horse.bodyHex,
      saddleColor: r.horse.saddleColor,
      saddleHex: r.horse.saddleHex,
      localId: i + 1
    }));

    raceHorseCache.set(Number(finalRace.id), horses);

    res.json({
      success: true,
      message: "Final race created and cached",
      raceId: Number(finalRace.id),
      horses
    });
  } catch (err) {
    console.error("❌ final-race failed:", err);
    res.status(500).json({ error: "Failed to create final race" });
  }
});

export default router;

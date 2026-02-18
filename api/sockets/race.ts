// File: api/sockets/race.ts
// Version: v2.7.0 — Fixes horseId mapping and applies payouts on socket race finish
// Date: 2025-05-30

import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { raceHorseCache } from "../routes/admin.js";

const prisma = new PrismaClient();
export let raceNamespace: ReturnType<Server["of"]>;

export function setupRaceNamespace(io: Server): void {
  raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket: Socket) => {
    console.log("✅ [WS] Client connected to /race:", socket.id);

    socket.on("startRace", handleStartRace);
    socket.on("admin:start-race", (payload) => handleStartRace(payload));

    socket.on("admin:open-bets", () => {
      raceNamespace.emit("admin:open-bets");
    });

    socket.on("admin:close-bets", () => {
      raceNamespace.emit("admin:close-bets");
    });

    socket.on("race:setup-failed", async ({ raceId, reason }: { raceId: string; reason: string }) => {
      try {
        const deleted = await prisma.race.delete({ where: { id: BigInt(raceId) } });
        console.log("🗑️ [DB] Invalid race deleted:", deleted.id.toString());
      } catch (err) {
        console.error("❌ [DB] Failed to delete invalid race:", err);
      }
      raceNamespace.emit("race:setup-aborted", { raceId, reason });
    });

    socket.on("race:finish", async ({ raceId, leaderboard }) => {
      console.log(`🏁 [KD] Received race:finish for raceId=${raceId} — saving results`);

      try {
        const { saved, resultHorseIds } = await saveRaceResults(BigInt(raceId), leaderboard);
        if (saved) {
          await applyRacePayouts(BigInt(raceId), resultHorseIds);
        }

        await prisma.race.update({
          where: { id: BigInt(raceId) },
          data: { endedAt: new Date() }
        });
        console.log(`✅ [KD] Race ${raceId} marked as ended`);
      } catch (err) {
        console.error(`❌ [KD] Failed to finalize race ${raceId}:`, err);
      }
    });
  });
}

async function handleStartRace({
  raceId,
  horses,
  horsePaths
}: {
  raceId: string;
  horses: { id: number; name: string; color: string }[];
  horsePaths: Record<number, any>;
}) {
  console.log("🧪 race:init is being emitted — backend log test");

  try {
    await prisma.race.update({
      where: { id: BigInt(raceId) },
      data: { startedAt: new Date() }
    });
  } catch (err) {
    console.error("[DB] Failed to update race with start time:", err);
    return;
  }

  const race = await prisma.race.findUnique({
    where: { id: BigInt(raceId) },
    select: { name: true }
  });

  if (!race) {
    console.error(`[KD] ❌ No race found for raceId=${raceId}`);
    return;
  }

  raceNamespace.emit("race:init", {
    raceId,
    raceName: race.name,
    horses,
    horsePaths
  });

  raceNamespace.emit("race:start", {
    raceId,
    horses
  });
}

async function saveRaceResults(
  raceId: bigint,
  leaderboard: { localId: number; timeMs: number }[]
): Promise<{ saved: boolean; resultHorseIds: number[] }> {
  const existing = await prisma.result.count({ where: { raceId } });
  if (existing > 0) {
    console.log(`[KD] ℹ️ Results already exist for race ${raceId}; skipping duplicate save`);
    const prior = await prisma.result.findMany({
      where: { raceId },
      orderBy: { position: "asc" },
      select: { horseId: true }
    });
    return { saved: false, resultHorseIds: prior.map(r => r.horseId) };
  }

  const cache = raceHorseCache.get(Number(raceId));
  if (!cache) {
    console.warn(`[KD] ⚠️ No horse cache found for race ${raceId}`);
    return { saved: false, resultHorseIds: [] };
  }

  const results = leaderboard.map((entry, index) => {
    const match = cache.find((h) => h.localId === entry.localId);
    if (!match) {
      throw new Error(`Horse with localId=${entry.localId} not found in cache`);
    }

    const horseId = match.horseId ?? match.id;
    if (typeof horseId !== "number") {
      throw new Error(`Horse id missing for localId=${entry.localId}`);
    }

    return {
      raceId,
      horseId,
      localId: entry.localId,
      position: index + 1,
      timeMs: entry.timeMs
    };
  });

  await prisma.result.createMany({ data: results });
  console.log(`[KD] ✅ Saved ${results.length} race results`);
  return { saved: true, resultHorseIds: results.map(r => r.horseId) };
}

async function applyRacePayouts(raceId: bigint, resultHorseIds: number[]): Promise<void> {
  if (resultHorseIds.length === 0) return;

  const winners = new Map<number, number>();
  if (resultHorseIds[0] !== undefined) winners.set(resultHorseIds[0], 3);
  if (resultHorseIds[1] !== undefined) winners.set(resultHorseIds[1], 2);
  if (resultHorseIds[2] !== undefined) winners.set(resultHorseIds[2], 1.5);

  if (winners.size === 0) return;

  const bets = await prisma.bet.findMany({ where: { raceId } });
  const payoutsByUser = new Map<number, number>();

  for (const bet of bets) {
    const multiplier = winners.get(bet.horseId);
    if (!multiplier) continue;
    const winnings = Math.floor(bet.amount * multiplier);
    payoutsByUser.set(bet.userId, (payoutsByUser.get(bet.userId) || 0) + winnings);
  }

  if (payoutsByUser.size === 0) {
    console.log(`[KD] ℹ️ No payout winners for race ${raceId}`);
    return;
  }

  await prisma.$transaction(
    Array.from(payoutsByUser.entries()).map(([userId, totalWinnings]) =>
      prisma.user.update({
        where: { id: userId },
        data: { leaseLoons: { increment: totalWinnings } }
      })
    )
  );

  console.log(`[KD] ✅ Paid out ${payoutsByUser.size} users for race ${raceId}`);
}

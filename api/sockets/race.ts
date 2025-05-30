// File: api/sockets/race.ts
// Version: v2.6.0 — Emits race name in race:init payload
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
      await saveRaceResults(BigInt(raceId), leaderboard);
      try {
        await prisma.race.update({
          where: { id: BigInt(raceId) },
          data: { endedAt: new Date() }
        });
        console.log(`✅ [KD] Race ${raceId} marked as ended`);
      } catch (err) {
        console.error(`❌ [KD] Failed to update endedAt for race ${raceId}:`, err);
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

  // ✅ Fetch race name
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
    raceName: race.name, // ✅ Send the real race name
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
) {
  const cache = raceHorseCache.get(Number(raceId));
  if (!cache) {
    console.warn(`[KD] ⚠️ No horse cache found for race ${raceId}`);
    return;
  }

  const results = leaderboard.map((entry, index) => {
    const match = cache.find((h) => h.localId === entry.localId);
    if (!match) {
      throw new Error(`Horse with localId=${entry.localId} not found in cache`);
    }

    return {
      raceId,
      horseId: match.horseId,
      localId: entry.localId,
      position: index + 1,
      timeMs: entry.timeMs
    };
  });

  try {
    await prisma.result.createMany({ data: results });
    console.log(`[KD] ✅ Saved ${results.length} race results`);
  } catch (err) {
    console.error("❌ [DB] Failed to save race results:", err);
  }
}

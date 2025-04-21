// File: api/sockets/race.js
// Version: v0.6.8 – Final standalone version with full logging, dynamic race ID, and DB-safe writes

import seedrandom from "seedrandom";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔧 Debug toggle
const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error("❌", ...args);

export function setupRaceNamespace(io) {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    debugLog("✅ [WS] Client connected to /race");

    socket.on("startRace", async ({ horses }) => {
      debugLog("🏁 [Race] startRace received");
      debugLog("🐎 Horses:", horses);

      try {
        // 🎯 Create the race (DB guarantees the ID exists before writing results)
        const race = await prisma.race.create({
          data: { startedAt: new Date() },
        });

        const raceId = Number(race.id); // Used for seeding and client-facing IDs
        debugLog(`🆕 [Race] Created race ID: ${raceId}`);

        const positions = {};
        const rng = seedrandom(String(raceId));

        for (const horse of horses) {
          positions[horse.id] = 0;
        }

        raceNamespace.emit("race:init", { raceId, horses });
        debugLog("📤 [Race] race:init emitted");

        const interval = setInterval(async () => {
          let allFinished = true;

          for (const horse of horses) {
            if (positions[horse.id] >= 1000) continue;

            const delta = 8 + Math.floor(rng() * 5);
            positions[horse.id] += delta;

            if (positions[horse.id] < 1000) allFinished = false;

            const pct = Math.min(positions[horse.id] / 10, 100);
            raceNamespace.emit("race:tick", { raceId, horseId: horse.id, pct });

            debugLog(`↪️ [Tick] Horse ${horse.id} advanced to ${pct.toFixed(1)}%`);
          }

          if (allFinished) {
            clearInterval(interval);
            debugLog("🏁 [Race] All horses finished");

            const leaderboard = Object.entries(positions)
              .sort(([, a], [, b]) => b - a)
              .map(([horseId], i) => ({
                horseId: parseInt(horseId),
                position: i + 1,
                timeMs: 3000 + i * 250,
              }));

            raceNamespace.emit("race:finish", { raceId, leaderboard });
            debugLog("📤 [Race] race:finish emitted", leaderboard);

            try {
              const topThree = leaderboard.slice(0, 3);

              for (const { horseId, position, timeMs } of topThree) {
                await prisma.result.create({
                  data: {
                    raceId: BigInt(race.id),
                    horseId,
                    position,
                    timeMs,
                  },
                });
                debugLog(`💾 [DB] Result saved: Horse ${horseId}, Pos ${position}, ${timeMs}ms`);
              }

              await prisma.race.update({
                where: { id: BigInt(race.id) },
                data: { endedAt: new Date() },
              });
              debugLog(`🛑 [DB] Race ${race.id} marked as ended`);
            } catch (err) {
              errorLog("[DB] Error saving results:", err);
            }
          }
        }, 1000 / 30); // 30 ticks/sec
      } catch (err) {
        errorLog("[Race] Failed to start race:", err);
      }
    });
  });
}

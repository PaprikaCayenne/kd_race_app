// File: api/sockets/race.js
// Version: v0.6.3 – BigInt-ready + Logging + Stable ticks

import seedrandom from "seedrandom";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🔧 Debug toggle
const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);

export function setupRaceNamespace(io) {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    debugLog("✅ [WS] Client connected to /race");

    socket.on("startRace", async ({ raceId, horses }) => {
      debugLog(`🏁 [Race] startRace received – RaceID: ${raceId}`);
      debugLog("🐎 Horses:", horses);

      const positions = {};
      const rng = seedrandom(String(raceId));

      raceNamespace.emit("race:init", { raceId, horses });
      debugLog("📤 [Race] race:init emitted");

      for (const horse of horses) {
        positions[horse.id] = 0;
      }

      const interval = setInterval(async () => {
        let allFinished = true;

        for (const horse of horses) {
          if (positions[horse.id] >= 1000) continue;

          const delta = 8 + Math.floor(rng() * 5);
          positions[horse.id] += delta;

          if (positions[horse.id] < 1000) allFinished = false;

          const pct = Math.min(positions[horse.id] / 10, 100);
          raceNamespace.emit("race:tick", {
            raceId,
            horseId: horse.id,
            pct,
          });

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

          raceNamespace.emit("race:finish", {
            raceId,
            leaderboard,
          });
          debugLog("📤 [Race] race:finish emitted", leaderboard);

          try {
            const topThree = leaderboard.slice(0, 3);
            for (const { horseId, position, timeMs } of topThree) {
              await prisma.result.create({
                data: {
                  raceId: BigInt(raceId), // 🛠️ Explicit BigInt cast for DB compatibility
                  horseId,
                  position,
                  timeMs,
                },
              });
              debugLog(`💾 [DB] Saved result: Horse ${horseId}, Position ${position}`);
            }
          } catch (error) {
            console.error("❌ [DB] Error saving results:", error);
          }
        }
      }, 1000 / 30); // 30 ticks per second
    });
  });
}

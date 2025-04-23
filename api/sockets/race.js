// File: api/sockets/race.js
// Version: v0.7.21 – Stable race simulation and DB sync

import seedrandom from "seedrandom";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error("❌", ...args);

export function setupRaceNamespace(io) {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    debugLog("✅ [WS] Client connected to /race:", socket.id);

    socket.on("startRace", async ({ raceId, horses }) => {
      debugLog(`🏁 [Race] startRace received – RaceID: ${raceId}`);
      debugLog("🐎 Horses:", horses);

      const rng = seedrandom(String(raceId));
      const horseStates = {};
      for (const horse of horses) {
        horseStates[horse.id] = 0;
      }

      raceNamespace.emit("race:init", { raceId, horses });
      debugLog("📤 [Race] race:init emitted");

      const interval = setInterval(async () => {
        let allFinished = true;

        for (const horse of horses) {
          if (horseStates[horse.id] >= 100) continue;

          const delta = 1.2 + rng() * 2.2; // ~1.2% to 3.4% per tick
          horseStates[horse.id] += delta;

          if (horseStates[horse.id] < 100) allFinished = false;

          raceNamespace.emit("race:tick", {
            raceId,
            horseId: horse.id,
            pct: Math.min(horseStates[horse.id], 100),
          });

          debugLog(
            `↪️ [Tick] Horse ${horse.id} → ${horseStates[horse.id].toFixed(1)}%`
          );
        }

        if (allFinished) {
          clearInterval(interval);
          debugLog("🏁 [Race] All horses finished");

          const leaderboard = Object.entries(horseStates)
            .sort(([, a], [, b]) => b - a)
            .map(([horseId], index) => ({
              horseId: parseInt(horseId),
              position: index + 1,
              timeMs: 3000 + index * 250,
            }));

          raceNamespace.emit("race:finish", { raceId, leaderboard });
          debugLog("📤 [Race] race:finish emitted", leaderboard);

          try {
            await prisma.race.create({
              data: {
                id: BigInt(raceId),
                startedAt: new Date(),
                endedAt: new Date(),
              },
            });

            for (const { horseId, position, timeMs } of leaderboard.slice(0, 3)) {
              await prisma.result.create({
                data: {
                  raceId: BigInt(raceId),
                  horseId,
                  position,
                  timeMs,
                },
              });
              debugLog(
                `💾 [DB] Result saved: Horse ${horseId}, Pos ${position}, ${timeMs}ms`
              );
            }
          } catch (err) {
            errorLog("[DB] Error saving results:", err);
          }
        }
      }, 1000 / 30); // 30 FPS
    });
  });
}

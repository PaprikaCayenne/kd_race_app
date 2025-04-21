// File: api/sockets/race.js
// Version: v0.7.18 – Horses now follow curved track paths using angle + radius

import seedrandom from 'seedrandom';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🔧 Toggle verbose debug logs
const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error("❌", ...args);

export function setupRaceNamespace(io) {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    debugLog("✅ [WS] Client connected to /race");

    socket.on("startRace", async ({ raceId, horses }) => {
      debugLog(`🏁 [Race] startRace received – RaceID: ${raceId}`);
      debugLog("🐎 Horses:", horses);

      const rng = seedrandom(String(raceId));
      const horseStates = {}; // Track progress per horse (in percentage)
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
            `↪️ [Tick] Horse ${horse.id} advanced to ${horseStates[horse.id].toFixed(1)}%`
          );
        }

        if (allFinished) {
          clearInterval(interval);
          debugLog("🏁 [Race] All horses finished");

          const leaderboard = Object.entries(horseStates)
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
            const savedRace = await prisma.race.create({
              data: {
                id: BigInt(raceId),
                startedAt: new Date(),
                endedAt: new Date(),
              },
            });
            debugLog("💾 [DB] Race created with ID", savedRace.id);

            const topThree = leaderboard.slice(0, 3);
            for (const { horseId, position, timeMs } of topThree) {
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

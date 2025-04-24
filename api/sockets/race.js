// File: api/sockets/race.js
// Version: v0.8.9 – Fix bug in frontend path usage and remove null toFixed crash

import seedrandom from "seedrandom";
import { PrismaClient } from "@prisma/client";
import { generateOvalPath } from "../utils/generateOvalPath.js";

const prisma = new PrismaClient();

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error("❌", ...args);

let currentTournamentSeed = Date.now();

export function setupRaceNamespace(io) {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    debugLog("✅ [WS] Client connected to /race:", socket.id);

    socket.on("admin:setTournamentSeed", ({ seed }) => {
      currentTournamentSeed = seed;
      debugLog("🌱 Tournament seed set to:", seed);
    });

    socket.on("startRace", async ({ raceId, horses }) => {
      debugLog(`🏁 [Race] startRace received – RaceID: ${raceId}`);
      debugLog("🐎 Horses:", horses);

      try {
        await prisma.race.create({
          data: {
            id: BigInt(raceId),
            startedAt: new Date(),
          },
        });
        debugLog("💾 [DB] Race inserted");
      } catch (err) {
        errorLog("[DB] Failed to insert race:", err);
        return;
      }

      const pathSeed = String(currentTournamentSeed);
      const basePath = generateOvalPath({
        centerX: 500,
        centerY: 350,
        radiusX: 300,
        radiusY: 200,
        straightLength: 200,
        resolution: 400,
        seed: pathSeed,
      });
      debugLog("🛣️ Track generated with seed:", pathSeed);

      const horsePaths = {};
      const laneOffset = 25;
      horses.forEach((horse, idx) => {
        horsePaths[horse.id] = basePath.map((point) => [point.x + idx * laneOffset, point.y + idx * laneOffset]);
      });

      const rng = seedrandom(String(raceId));
      const horseStates = {};
      const startTime = Date.now();

      for (const horse of horses) {
        horseStates[horse.id] = 0;
      }

      raceNamespace.emit("race:init", { raceId, horses, horsePaths });
      debugLog("📤 [Race] race:init emitted with paths");

      const interval = setInterval(async () => {
        let allFinished = true;

        for (const horse of horses) {
          if (horseStates[horse.id] >= 100) continue;

          const delta = 1.2 + rng() * 2.2;
          horseStates[horse.id] += delta;

          const pct = Math.min(horseStates[horse.id], 100);
          const timeMs = Date.now() - startTime;

          try {
            await prisma.replayFrame.create({
              data: {
                raceId: BigInt(raceId),
                horseId: horse.id,
                pct,
                timeMs,
              },
            });
          } catch (err) {
            errorLog("❌ [DB] Failed to store replay frame:", err);
          }

          raceNamespace.emit("race:tick", { raceId, horseId: horse.id, pct });
          debugLog(`↪️ [Tick] Horse ${horse.id} → ${pct.toFixed(1)}%`);

          if (pct < 100) allFinished = false;
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

          raceNamespace.emit("race:finish", leaderboard);
          debugLog("📤 [Race] race:finish emitted", leaderboard);

          try {
            await prisma.race.update({
              where: { id: BigInt(raceId) },
              data: { endedAt: new Date() },
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
              debugLog(`💾 [DB] Result saved: Horse ${horseId}, Pos ${position}, ${timeMs}ms`);
            }
          } catch (err) {
            errorLog("[DB] Error saving results:", err);
          }
        }
      }, 1000 / 30);
    });
  });
}

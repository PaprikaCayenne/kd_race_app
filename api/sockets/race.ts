// File: api/sockets/race.ts
// Version: v0.9.1 – Fix TS import paths after migration

import seedrandom from "seedrandom";
import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { generateRoundedRectCenterline } from "../utils/generateRoundedRectCenterline.ts";
import { generateHorsePathWithSpeed } from "../utils/generateHorsePathWithSpeed.ts";
import { Point } from "../types";

const prisma = new PrismaClient();

const DEBUG = true;
const debugLog = (...args: any[]) => DEBUG && console.log(...args);
const errorLog = (...args: any[]) => console.error("❌", ...args);

let currentTournamentSeed = Date.now();

export function setupRaceNamespace(io: Server): void {
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket: Socket) => {
    debugLog("✅ [WS] Client connected to /race:", socket.id);

    socket.on("admin:setTournamentSeed", ({ seed }: { seed: number }) => {
      currentTournamentSeed = seed;
      debugLog("🌱 Tournament seed set to:", seed);
    });

    socket.on("startRace", async ({
      raceId,
      horses
    }: {
      raceId: string;
      horses: { id: number; name: string; color: string }[];
    }) => {
      debugLog(`🏁 [Race] startRace received – RaceID: ${raceId}`);
      debugLog("🐎 Horses:", horses);

      try {
        await prisma.race.create({
          data: {
            id: BigInt(raceId),
            startedAt: new Date()
          }
        });
        debugLog("💾 [DB] Race inserted");
      } catch (err) {
        errorLog("[DB] Failed to insert race:", err);
        return;
      }

      const rng = seedrandom(String(currentTournamentSeed));
      const innerBounds = { x: 200, y: 150, width: 600, height: 350 };
      const cornerRadius = 120;
      const centerline: Point[] = generateRoundedRectCenterline(
        innerBounds,
        cornerRadius,
        400
      );

      const horsePaths = generateHorsePathWithSpeed(centerline, {
        laneCount: horses.length,
        startAt: centerline[0],
        debug: true,
        debugOutputPath: `./replays/paths-race-${raceId}.json`
      });

      const horseStates: Record<number, number> = {};
      const startTime = Date.now();

      for (const horse of horses) {
        horseStates[horse.id] = 0;
      }

      raceNamespace.emit("race:init", {
        raceId,
        horses,
        horsePaths
      });
      debugLog("📤 [Race] race:init emitted with generated paths");

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
                timeMs
              }
            });
          } catch (err) {
            errorLog("❌ [DB] Failed to store replay frame:", err);
          }

          raceNamespace.emit("race:tick", {
            raceId,
            horseId: horse.id,
            pct
          });
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
              timeMs: 3000 + index * 250
            }));

          raceNamespace.emit("race:finish", leaderboard);
          debugLog("📤 [Race] race:finish emitted", leaderboard);

          try {
            await prisma.race.update({
              where: { id: BigInt(raceId) },
              data: { endedAt: new Date() }
            });

            for (const { horseId, position, timeMs } of leaderboard.slice(0, 3)) {
              await prisma.result.create({
                data: {
                  raceId: BigInt(raceId),
                  horseId,
                  position,
                  timeMs
                }
              });
              debugLog(
                `💾 [DB] Result saved: Horse ${horseId}, Pos ${position}, ${timeMs}ms`
              );
            }
          } catch (err) {
            errorLog("[DB] Error saving results:", err);
          }
        }
      }, 1000 / 30);
    });
  });
}

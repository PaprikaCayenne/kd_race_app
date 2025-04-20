import seedrandom from "seedrandom";
import { pool } from "../db.js";

export function setupRaceNamespace(io) {
  io.on("connection", (socket) => {
    console.log("✅ Socket.IO client connected");

    socket.on("startRace", async ({ raceId, horses }) => {
      const leaderboard = [];
      const positions = {};
      const rng = seedrandom(String(raceId));

      io.emit("race:init", { raceId, horses });

      for (const horse of horses) {
        positions[horse.id] = 0;
      }

      const interval = setInterval(async () => {
        let allFinished = true;

        for (const horse of horses) {
          if (positions[horse.id] >= 1000) continue;
          const delta = 8 + Math.floor(rng() * 5); // 8–12
          positions[horse.id] += delta;
          if (positions[horse.id] < 1000) allFinished = false;

          io.emit("race:tick", {
            raceId,
            horseId: horse.id,
            pct: Math.min(positions[horse.id] / 10, 100),
          });
        }

        if (allFinished) {
          clearInterval(interval);

          const sorted = Object.entries(positions)
            .sort(([, a], [, b]) => b - a)
            .map(([horseId], i) => ({
              horseId: parseInt(horseId),
              position: i + 1,
              timeMs: 3000 + i * 250,
            }));

          io.emit("race:finish", {
            raceId,
            leaderboard: sorted,
          });

          const client = await pool.connect();
          for (let i = 0; i < 3 && i < sorted.length; i++) {
            const { horseId, position, timeMs } = sorted[i];
            await client.query(
              "INSERT INTO results (race_id, horse_id, position, time_ms) VALUES ($1, $2, $3, $4)",
              [raceId, horseId, position, timeMs]
            );
          }
          client.release();
        }
      }, 1000 / 30);
    });
  });
}
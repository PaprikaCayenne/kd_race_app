import seedrandom from "seedrandom";
import { pool } from "../db.js";

export function setupRaceNamespace(io) {
  // 🎯 Use the '/race' namespace, which matches the frontend
  const raceNamespace = io.of("/race");

  raceNamespace.on("connection", (socket) => {
    console.log("✅ [WS] Client connected to /race");

    // 📦 Incoming race start from admin
    socket.on("startRace", async ({ raceId, horses }) => {
      console.log(`🏁 Starting race ${raceId} with ${horses.length} horses`);

      const leaderboard = [];
      const positions = {};
      const rng = seedrandom(String(raceId));

      // 🎬 Send init event to all clients
      raceNamespace.emit("race:init", { raceId, horses });

      // 🐎 Initialize all horse positions
      for (const horse of horses) {
        positions[horse.id] = 0;
      }

      // ⏱️ Start race ticker at 30 fps
      const interval = setInterval(async () => {
        let allFinished = true;

        for (const horse of horses) {
          if (positions[horse.id] >= 1000) continue;

          const delta = 8 + Math.floor(rng() * 5); // Each tick: +8 to +12 units
          positions[horse.id] += delta;

          if (positions[horse.id] < 1000) allFinished = false;

          // 🔁 Send updated position
          raceNamespace.emit("race:tick", {
            raceId,
            horseId: horse.id,
            pct: Math.min(positions[horse.id] / 10, 100),
          });
        }

        // 🏁 When all horses are done
        if (allFinished) {
          clearInterval(interval);

          const sorted = Object.entries(positions)
            .sort(([, a], [, b]) => b - a)
            .map(([horseId], i) => ({
              horseId: parseInt(horseId),
              position: i + 1,
              timeMs: 3000 + i * 250,
            }));

          // 🏆 Send final standings
          raceNamespace.emit("race:finish", {
            raceId,
            leaderboard: sorted,
          });

          // 🗃️ Save top 3 results to DB
          const client = await pool.connect();
          try {
            for (let i = 0; i < 3 && i < sorted.length; i++) {
              const { horseId, position, timeMs } = sorted[i];
              await client.query(
                "INSERT INTO results (race_id, horse_id, position, time_ms) VALUES ($1, $2, $3, $4)",
                [raceId, horseId, position, timeMs]
              );
            }
          } finally {
            client.release();
          }
        }
      }, 1000 / 30); // 30 ticks per second
    });
  });
}

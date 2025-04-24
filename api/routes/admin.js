// File: api/routes/admin.js
// Version: v0.4.4 – Add debug log for race:init emit with socket size check

import express from "express";
import prisma from "../lib/prisma.js";

export function createAdminRoute(io) {
  const router = express.Router();

  router.post("/start", async (req, res) => {
    const pass = req.headers["x-admin-pass"];
    if (pass !== process.env.API_ADMIN_PASS) {
      console.warn("⛔ Invalid admin pass", pass);
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("✅ Admin pass verified");

      const racedHorseIds = await prisma.result.findMany({
        distinct: ["horseId"],
        select: { horseId: true },
      });
      console.log("🎯 Raced horse IDs:", racedHorseIds);

      const racedIds = racedHorseIds.map((r) => r.horseId);
      const unraced = await prisma.horse.findMany({
        where: { id: { notIn: racedIds } },
      });
      console.log("🐎 Unraced horses count:", unraced.length);

      if (unraced.length < 4) {
        console.warn("🚫 Not enough unraced horses");
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      const selected = unraced.sort(() => Math.random() - 0.5).slice(0, 4);
      console.log("🎲 Selected horses:", selected.map(h => h.name));

      const race = await prisma.race.create({ data: {} });
      console.log("🏁 Race created with ID:", race.id);

      const raceNamespace = io.of("/race");

      if (raceNamespace.sockets.size > 0) {
        console.log("📡 Emitting race:init:", {
          raceId: race.id.toString(),
          horses: selected.map(h => h.name)
        });

        raceNamespace.emit("race:init", {
          raceId: race.id.toString(),
          horses: selected.map((h) => ({
            id: h.id.toString(),
            name: h.name,
            color: h.color,
          })),
        });
      } else {
        console.warn("⚠️ No clients connected to /race — skipping emit");
      }

      res.json({ success: true, raceId: race.id.toString() });
    } catch (err) {
      console.error("💥 Error in /api/admin/start:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

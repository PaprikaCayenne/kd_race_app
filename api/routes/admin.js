import express from "express";
import { prisma } from "../index.js";
import seedrandom from "seedrandom";

// ✅ Exported as named
export function createAdminRoute(io) {
  const router = express.Router();

  router.post("/start", async (req, res) => {
    const pass = req.headers["x-admin-pass"];
    if (pass !== process.env.API_ADMIN_PASS) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Find all unraced horses
      const racedHorseIds = await prisma.result.findMany({
        distinct: ['horseId'],
        select: { horseId: true },
      });

      const racedIds = racedHorseIds.map(r => r.horseId);
      const unraced = await prisma.horse.findMany({
        where: { id: { notIn: racedIds } },
      });

      if (unraced.length < 4) {
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      const selected = unraced.sort(() => Math.random() - 0.5).slice(0, 4);

      const race = await prisma.race.create({ data: {} });

      io.of("/race").emit("race:init", {
        raceId: race.id,
        horses: selected.map(h => ({
          id: h.id,
          name: h.name,
          color: h.color,
        })),
      });

      res.json({ success: true, raceId: race.id });
    } catch (err) {
      console.error("Error starting race:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

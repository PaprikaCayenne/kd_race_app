import express from "express";
import dotenv from "dotenv";
import { prisma } from "../index.js"; // Uses global Prisma client

dotenv.config();

const createAdminRoute = (io) => {
  const router = express.Router();

  router.post("/start", async (req, res) => {
    const adminPass = req.header("x-admin-pass");
    if (adminPass !== process.env.API_ADMIN_PASS) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // 1. Get all horse IDs that already raced
      const racedHorseIdsRaw = await prisma.result.findMany({
        distinct: ["horse_id"],
        select: { horse_id: true },
      });
      const racedHorseIds = racedHorseIdsRaw.map(row => row.horse_id);

      // 2. Get horses that haven't raced yet
      const availableHorses = await prisma.horse.findMany({
        where: {
          id: {
            notIn: racedHorseIds.length ? racedHorseIds : [0],
          },
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });

      // 3. Not enough horses?
      if (availableHorses.length < 4) {
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      // 4. Randomly pick 4
      const shuffled = availableHorses.sort(() => 0.5 - Math.random());
      const selectedHorses = shuffled.slice(0, 4);

      // 5. Create new race
      const race = await prisma.race.create({
        data: {
          started_at: new Date(),
        },
      });

      // 6. Emit WebSocket event
      io.of("/race").emit("race:init", {
        raceId: race.id,
        horses: selectedHorses,
      });

      // 7. Respond to admin
      res.json({ raceId: race.id, horses: selectedHorses });
    } catch (err) {
      console.error("Error starting race:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};

export default createAdminRoute;

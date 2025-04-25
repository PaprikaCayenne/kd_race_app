// File: api/routes/admin.ts
// Version: v0.5.3 – Fix TS import path for generateHorsePathWithSpeed

import express, { Request, Response } from "express";
import { Server } from "socket.io";
import prisma from "../lib/prisma.js";
import generateOvalPath from "../utils/generateOvalPath";
import { generateHorsePathWithSpeed } from "../utils/generateHorsePathWithSpeed.ts";
import fs from "fs";

export function createAdminRoute(io: Server) {
  const router = express.Router();

  router.post("/start", async (req: Request, res: Response) => {
    const pass = req.headers["x-admin-pass"];
    if (pass !== process.env.API_ADMIN_PASS) {
      console.warn("⛔ Invalid admin pass", pass);
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("✅ Admin pass verified");

      const racedHorseIds = await prisma.result.findMany({
        distinct: ["horseId"],
        select: { horseId: true }
      });

      const racedIds = racedHorseIds.map((r) => r.horseId);
      const unraced = await prisma.horse.findMany({
        where: { id: { notIn: racedIds } }
      });

      if (unraced.length < 4) {
        console.warn("🚫 Not enough unraced horses");
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      const selected = unraced.sort(() => Math.random() - 0.5).slice(0, 4);
      const race = await prisma.race.create({ data: {} });

      // 🛣️ Receive centerline from frontend if available
      const body = req.body as { centerline?: { x: number; y: number }[] };
      let centerline = body?.centerline;

      if (!centerline || !Array.isArray(centerline) || centerline.length < 10) {
        console.warn("⚠️ No valid centerline provided — using default generated oval");
        centerline = generateOvalPath({
          centerX: 500,
          centerY: 350,
          radiusX: 300,
          radiusY: 200,
          straightLength: 250,
          resolution: 400
        });
      }

      const horsePaths = generateHorsePathWithSpeed(centerline, {
        laneCount: selected.length,
        debug: true,
        debugOutputPath: `./debug/race-${race.id}-paths.json`
      });

      const raceNamespace = io.of("/race");
      if (raceNamespace.sockets.size > 0) {
        const payload = {
          raceId: race.id.toString(),
          horses: selected.map((h, i) => ({
            id: h.id.toString(),
            name: h.name,
            color: h.color,
            path: horsePaths[i]
          }))
        };

        const sizeKb = Buffer.byteLength(JSON.stringify(payload)) / 1024;
        console.log(`📡 Emitting race:init (${sizeKb.toFixed(2)} KB)`);
        raceNamespace.emit("race:init", payload);
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

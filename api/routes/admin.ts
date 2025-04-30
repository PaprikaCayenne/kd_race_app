// File: api/routes/admin.ts
// Version: v0.6.4 — Send horse color as string (frontend parses), no backend parseInt

import express, { Request, Response } from "express";
import { Server } from "socket.io";
import prisma from "../lib/prisma.js";
import generateOvalPath from "../utils/generateOvalPath";
import { generateHorsePathWithSpeed } from "../utils/generateHorsePathWithSpeed.js";
import fs from "fs";
import pako from "pako";

function getTimestamp() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);
  const hour12 = parts.hour.padStart(2, "0");
  const minute = parts.minute.padStart(2, "0");
  const ampm = parts.dayPeriod;
  return `${parts.month}-${parts.day}-${parts.year}_${hour12}-${minute}${ampm}`;
}

export function createAdminRoute(io: Server) {
  const router = express.Router();

  router.post("/start", async (req: Request, res: Response) => {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] 🏁 KD Backend Race Logic Version: v0.6.4`);

    const pass = req.headers["x-admin-pass"];
    if (pass !== process.env.API_ADMIN_PASS) {
      console.warn(`[${timestamp}] ⛔ Invalid admin pass attempt`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log(`[${timestamp}] ✅ Admin pass verified`);

      const racedHorseIds = await prisma.result.findMany({
        distinct: ["horseId"],
        select: { horseId: true }
      });
      const racedIds = racedHorseIds.map(r => r.horseId);

      const unraced = await prisma.horse.findMany({
        where: { id: { notIn: racedIds } }
      });

      if (unraced.length < 4) {
        console.warn(`[${timestamp}] 🚫 Not enough unraced horses`);
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      const selected = unraced.sort(() => Math.random() - 0.5).slice(0, 4);
      const race = await prisma.race.create({ data: {} });

      const body = req.body as {
        centerline?: { x: number; y: number }[];
        innerBoundary?: { x: number; y: number }[];
        outerBoundary?: { x: number; y: number }[];
        startAt?: { x: number; y: number };
      };

      console.log(`[${timestamp}] 🔹 Received body sample`, {
        centerlineSample: body.centerline?.slice(0, 5),
        startAt: body.startAt,
        innerBoundarySample: body.innerBoundary?.slice(0, 5),
        outerBoundarySample: body.outerBoundary?.slice(0, 5)
      });

      let centerline = body?.centerline;
      let innerBoundary = body?.innerBoundary;
      let outerBoundary = body?.outerBoundary;
      let startAt = body?.startAt;

      if (!centerline || !innerBoundary || !outerBoundary || !startAt) {
        console.warn(`[${timestamp}] ⚠️ Missing or invalid track data — aborting`);
        return res.status(400).json({ error: "Invalid track data" });
      }

      const debugOutputPath = `./debug/race-${race.id}-paths-${timestamp}.json`;

      const horsePaths = generateHorsePathWithSpeed(centerline, {
        laneCount: selected.length,
        debug: true,
        debugOutputPath,
        innerBoundary,
        outerBoundary,
        startAt
      });

      const raceNamespace = io.of("/race");
      if (raceNamespace.sockets.size > 0) {
        const payload = {
          raceId: race.id.toString(),
          horses: selected.map((h, i) => ({
            id: h.id.toString(),
            name: h.name,
            color: h.color, // send as string, not parsed
            path: horsePaths[i]
          }))
        };

        const compressed = pako.deflate(JSON.stringify(payload));
        const sizeBefore = Buffer.byteLength(JSON.stringify(payload)) / 1024;
        const sizeAfter = compressed.length / 1024;
        console.log(`[${timestamp}] 📦 Emitting race:init (before: ${sizeBefore.toFixed(2)} KB, after: ${sizeAfter.toFixed(2)} KB)`);

        raceNamespace.emit("race:init", compressed);
      } else {
        console.warn(`[${timestamp}] ⚠️ No clients connected to /race — skipping emit`);
      }

      res.json({ success: true, raceId: race.id.toString() });
    } catch (err) {
      console.error(`[${timestamp}] 💥 Error in /api/admin/start:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

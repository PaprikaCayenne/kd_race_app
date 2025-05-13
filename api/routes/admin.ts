// File: api/routes/admin.ts
// Version: v0.7.30 — Updates finishIndex logic to ensure 1-lap races

import express, { Request, Response } from "express";
import { Server } from "socket.io";
import prisma from "../lib/prisma.js";
import pako from "pako";
import { generateGreyOvalTrack } from "../utils/generateGreyOvalTrack";
import { computeTrackGeometry } from "../utils/computeTrackGeometry";
import { generateHorsePathWithSpeed } from "../utils/generateHorsePathWithSpeed";

const START_LINE_OFFSET_PX = 10;

function getTimestamp() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);
  return `${parts.month}-${parts.day}_${parts.year}_${parts.hour.padStart(2, "0")}-${parts.minute}${parts.dayPeriod}`;
}

export function createAdminRoute(io: Server) {
  const router = express.Router();

  router.post("/start", express.json(), async (req: Request, res: Response) => {
    const timestamp = getTimestamp();
    console.log(`[${timestamp}] 🏁 KD Backend Race Logic Version: v0.7.30`);

    const pass = req.headers["x-admin-pass"];
    if (pass !== process.env.API_ADMIN_PASS) {
      console.warn(`[${timestamp}] ⛔ Invalid admin pass`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { startAtPercent, width, height } = req.body;
    if (
      typeof startAtPercent !== "number" ||
      typeof width !== "number" ||
      typeof height !== "number" ||
      isNaN(startAtPercent) ||
      isNaN(width) ||
      isNaN(height)
    ) {
      console.warn(`[${timestamp}] ❌ Invalid POST body:`, req.body);
      return res.status(400).json({ error: "Missing or invalid track parameters" });
    }

    const clampedPercent = Math.min(Math.max(startAtPercent, 0), 1);
    const safeWidth = Math.max(width, 800);
    const safeHeight = Math.max(height, 400);

    try {
      const racedIds = (
        await prisma.result.findMany({
          distinct: ["horseId"],
          select: { horseId: true }
        })
      ).map(r => r.horseId);

      const unraced = await prisma.horse.findMany({
        where: { id: { notIn: racedIds } }
      });

      if (unraced.length < 4) {
        console.warn(`[${timestamp}] 🚫 Not enough unraced horses`);
        return res.status(400).json({ error: "Not enough unraced horses" });
      }

      const selected = unraced.sort(() => Math.random() - 0.5).slice(0, 4);
      const race = await prisma.race.create({ data: {} });

      const track = generateGreyOvalTrack({ width: safeWidth, height: safeHeight }, clampedPercent);

      const {
        rotatedInner,
        rotatedOuter,
        rotatedCenterline
      } = computeTrackGeometry(
        track.innerBounds.pointsArray,
        track.outerBounds.pointsArray,
        track.centerline,
        track.startAt
      );

      const dx = rotatedCenterline[1].x - rotatedCenterline[0].x;
      const dy = rotatedCenterline[1].y - rotatedCenterline[0].y;
      const startAngle = Math.atan2(dy, dx);

      const raceNamespace = io.of("/race");

      if (raceNamespace.sockets.size > 0) {
        const horses = selected.map((h, i) => {
          const placement = i + 1;
          const pathData = track.perPlacement[placement];

          const result = generateHorsePathWithSpeed({
            horseId: h.id.toString(),
            placement,
            totalHorses: selected.length,
            pathData
          });

          return {
            id: h.id.toString(),
            name: h.name,
            color: h.color,
            placement,
            ...result
          };
        });

        const payload = {
          raceId: race.id.toString(),
          centerline: rotatedCenterline,
          innerBoundary: rotatedInner,
          outerBoundary: rotatedOuter,
          startAt: track.startAt,
          startLineAt: track.startLineAt,
          startAngle,
          startLineOffsetPx: START_LINE_OFFSET_PX,
          horses
        };

        const compressed = pako.deflate(JSON.stringify(payload));
        const sizeBefore = Buffer.byteLength(JSON.stringify(payload)) / 1024;
        const sizeAfter = compressed.length / 1024;
        console.log(`[${timestamp}] 📦 Emitting race:init (before: ${sizeBefore.toFixed(2)} KB, after: ${sizeAfter.toFixed(2)} KB)`);

        raceNamespace.emit("race:init", compressed);
        setTimeout(() => {
          raceNamespace.emit("race:start");
          console.log(`[${timestamp}] 🏇 race:start event emitted to /race clients`);
        }, 500);
      } else {
        console.warn(`[${timestamp}] ⚠️ No clients connected to /race`);
      }

      res.json({ success: true, raceId: race.id.toString() });
    } catch (err) {
      console.error(`[${timestamp}] 💥 Error in /api/admin/start`, {
        body: req.body,
        error: err
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

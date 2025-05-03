// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.9.10 — Use first horse's X as fixed alignment for all lanes

import fs from "fs";
import { Point } from "../types";

export interface HorsePathConfig {
  laneCount: number;
  startAt: Point;
  startInnerPoint: Point;
  startOuterPoint: Point;
  innerBoundary: Point[];
  outerBoundary: Point[];
  debug?: boolean;
  debugOutputPath?: string;
}

export interface HorsePathResult {
  path: Point[];
  startPoint: Point;
}

export function generateHorsePathWithSpeed(
  centerline: Point[],
  config: HorsePathConfig
): HorsePathResult[] {
  console.log("[KD] 🛠 Horse Path Generator Version: v0.9.10");

  const {
    laneCount,
    startAt,
    startInnerPoint,
    startOuterPoint,
    innerBoundary,
    outerBoundary,
    debug,
    debugOutputPath
  } = config;

  const length = centerline.length;
  if (
    innerBoundary.length !== length ||
    outerBoundary.length !== length ||
    centerline.length !== length
  ) {
    throw new Error("All boundaries must have the same length");
  }

  const findClosestIndex = (arr: Point[], target: Point) => {
    let bestIdx = 0;
    let minDist = Infinity;
    arr.forEach((p, i) => {
      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        bestIdx = i;
        minDist = dist;
      }
    });
    return bestIdx;
  };

  const startIdx = findClosestIndex(centerline, startAt);
  const offsetSteps = 3;
  const startFromIdx = (startIdx - offsetSteps + length) % length;

  const TRACK_PADDING = 0.1;
  const SPRITE_LENGTH = 30;
  const horses: HorsePathResult[] = [];

  const forward = {
    x: centerline[(startIdx + 1) % length].x - centerline[startIdx].x,
    y: centerline[(startIdx + 1) % length].y - centerline[startIdx].y
  };
  const forwardLen = Math.sqrt(forward.x ** 2 + forward.y ** 2);
  const forwardNorm = { x: forward.x / forwardLen, y: forward.y / forwardLen };

  const span = {
    x: startOuterPoint.x - startInnerPoint.x,
    y: startOuterPoint.y - startInnerPoint.y
  };

  let fixedX: number | null = null;

  for (let lane = 0; lane < laneCount; lane++) {
    const lanePath: Point[] = [];
    const fraction = TRACK_PADDING + ((1 - 2 * TRACK_PADDING) * (lane + 0.5)) / laneCount;

    const baseOnLine = {
      x: startInnerPoint.x + span.x * fraction,
      y: startInnerPoint.y + span.y * fraction
    };

    const rawStartPoint = {
      x: baseOnLine.x - forwardNorm.x * SPRITE_LENGTH,
      y: baseOnLine.y - forwardNorm.y * SPRITE_LENGTH
    };

    // 🧪 Fix all Xs to match first lane's start point
    if (fixedX === null) {
      fixedX = rawStartPoint.x;
    }

    const startPoint = {
      x: fixedX,
      y: rawStartPoint.y
    };

    for (let i = 0; i < length; i++) {
      const idx = (startFromIdx + i) % length;
      const inner = innerBoundary[idx];
      const outer = outerBoundary[idx];
      const dx = outer.x - inner.x;
      const dy = outer.y - inner.y;
      const px = inner.x + dx * fraction;
      const py = inner.y + dy * fraction;
      lanePath.push({ x: px, y: py });
    }

    horses.push({ path: lanePath, startPoint });
  }

  if (debug && debugOutputPath) {
    const dir = debugOutputPath.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(debugOutputPath, JSON.stringify(horses, null, 2));
    console.log(`[KD] 🧾 Debug written to ${debugOutputPath}`);
  }

  return horses;
}

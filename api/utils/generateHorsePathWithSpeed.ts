// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.9.5 — Adds outbound paddedPath debug log for WS validation

import { Point } from '@/types/geometry';
import calculateLaneFraction from './calculateLaneFraction';
import interpolateLanePoint from './interpolateLanePoint';

interface HorsePathOptions {
  horseId: string;
  innerBoundary: Point[];
  outerBoundary: Point[];
  rotatedCenterline: Point[];
  startAt: Point;
  startLineAt: Point;
  totalHorses: number;
  placement: number;
  spriteRadius?: number;
  spacingPx?: number;
  preStartPadding?: number;
}

export function generateHorsePathWithSpeed({
  horseId,
  innerBoundary,
  outerBoundary,
  rotatedCenterline,
  startAt,
  startLineAt,
  totalHorses,
  placement,
  spriteRadius = 12,
  spacingPx = 6,
  preStartPadding = 8
}: HorsePathOptions) {
  const debug: Record<string, any> = {
    version: 'v0.9.5',
    input: { horseId, placement, totalHorses, spriteRadius, spacingPx }
  };

  if (!Array.isArray(innerBoundary) || !Array.isArray(outerBoundary) || !Array.isArray(rotatedCenterline) || innerBoundary.length !== outerBoundary.length) {
    throw new Error('generateHorsePathWithSpeed: invalid input boundaries');
  }

  const dx = rotatedCenterline[1].x - rotatedCenterline[0].x;
  const dy = rotatedCenterline[1].y - rotatedCenterline[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) throw new Error('generateHorsePathWithSpeed: invalid tangent');
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;

  const baseStart = rotatedCenterline[0];
  const offsetFromCenter = (placement - (totalHorses + 1) / 2) * (spriteRadius * 2 + spacingPx);

  const START_BEHIND_PX = 60;
  const finalStartPoint = {
    x: baseStart.x + perpX * offsetFromCenter - dirX * START_BEHIND_PX,
    y: baseStart.y + perpY * offsetFromCenter - dirY * START_BEHIND_PX
  };

  let laneFrac = calculateLaneFraction(placement, totalHorses);
  laneFrac = Math.max(0.05, Math.min(0.95, laneFrac));
  let rawLanePath: Point[] = innerBoundary.map((inner, i) =>
    interpolateLanePoint(inner, outerBoundary[i], laneFrac)
  );

  const signedArea = rawLanePath.reduce((area, pt, i, arr) => {
    const next = arr[(i + 1) % arr.length];
    return area + (pt.x * next.y - next.x * pt.y);
  }, 0);

  const isClockwise = signedArea < 0;
  if (isClockwise) {
    rawLanePath.reverse();
    console.warn(`[KD] 🔁 Reversed rawLanePath due to clockwise direction (signedArea=${signedArea.toFixed(2)})`);
  }

  let startIndex = 0;
  let minDist = Infinity;
  for (let i = 0; i < rawLanePath.length; i++) {
    const dx = rawLanePath[i].x - finalStartPoint.x;
    const dy = rawLanePath[i].y - finalStartPoint.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      startIndex = i;
    }
  }

  const paddedPath: Point[] = [];
  for (let i = -preStartPadding; i < rawLanePath.length; i++) {
    const idx = (startIndex + i + rawLanePath.length) % rawLanePath.length;
    paddedPath.push(rawLanePath[idx]);
  }

  const dirLaneX = paddedPath[1].x - paddedPath[0].x;
  const dirLaneY = paddedPath[1].y - paddedPath[0].y;
  const laneLen = Math.sqrt(dirLaneX * dirLaneX + dirLaneY * dirLaneY);
  const laneDirX = dirLaneX / laneLen;
  const laneDirY = dirLaneY / laneLen;
  const dot = laneDirX * dirX + laneDirY * dirY;

  console.log(`[DEBUG] 🎯 lane path direction = (${laneDirX.toFixed(3)}, ${laneDirY.toFixed(3)})`);
  console.log(`[DEBUG] 🧭 centerline direction = (${dirX.toFixed(3)}, ${dirY.toFixed(3)})`);
  console.log(`[DEBUG] 🔍 dot product = ${dot.toFixed(3)} (should be close to 1)`);
  console.log(`[DEBUG] 🔁 signedArea = ${signedArea.toFixed(2)} → ${isClockwise ? 'CW (reversed)' : 'CCW (ok)'}`);

  if (Math.abs(offsetFromCenter) > TRACK_WIDTH) {
    console.warn(`[KD] ⚠️ Placement offset (${offsetFromCenter}px) exceeds track width (${TRACK_WIDTH}px)`);
  }

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts v0.9.5 (horseId: ${horseId}, placement: ${placement})`);
  console.log(`[KD] 🐎 startPoint=(${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[KD] ↕ offset=${offsetFromCenter.toFixed(1)}px → direction=(${dirX.toFixed(3)}, ${dirY.toFixed(3)})`);
  console.log(`[DEBUG] 🚦 centerline[0] = (${baseStart.x.toFixed(1)}, ${baseStart.y.toFixed(1)})`);
  console.log(`[DEBUG] 🧭 tangent = (${dx.toFixed(3)}, ${dy.toFixed(3)})`);
  console.log(`[DEBUG] ↔ offset vector = (${(perpX * offsetFromCenter).toFixed(1)}, ${(perpY * offsetFromCenter).toFixed(1)})`);
  console.log(`[DEBUG] 🐴 finalStartPoint = (${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[DEBUG] 🧱 paddedPath start = (${paddedPath[0].x.toFixed(1)}, ${paddedPath[0].y.toFixed(1)})`);
  console.log(`[DEBUG] 🧱 paddedPath end   = (${paddedPath.at(-1)?.x.toFixed(1)}, ${paddedPath.at(-1)?.y.toFixed(1)})`);

  // ✅ Emit sample of actual path to verify WebSocket outbound payload matches expectation
  console.log(`[DEBUG] 🧵 WebSocket path sample for ${horseId}:\n` +
    JSON.stringify(paddedPath.slice(0, 5), null, 2));

  return {
    horseId,
    path: paddedPath,
    startPoint: finalStartPoint,
    direction: { x: dirX, y: dirY },
    debug,
    rotatedCenterline
  };
}

const TRACK_WIDTH = 120;

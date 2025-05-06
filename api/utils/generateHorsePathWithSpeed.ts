// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.7.14 — Adds per-horse curved path while keeping shared startPoint for stacking

import { Point } from '@/types/geometry';
import calculateLaneFraction from './calculateLaneFraction';
import interpolateLanePoint from './interpolateLanePoint';
import { computeTrackGeometry } from './computeTrackGeometry';

interface HorsePathOptions {
  id: number;
  innerBoundary: Point[];
  outerBoundary: Point[];
  centerline: Point[];
  startAt: Point;
  startLineAt: Point;
  totalHorses: number;
  placement: number;
  spriteRadius?: number;
  spacingPx?: number;
}

export function generateHorsePathWithSpeed({
  id,
  innerBoundary,
  outerBoundary,
  centerline,
  startAt,
  startLineAt,
  totalHorses,
  placement,
  spriteRadius = 12,
  spacingPx = 6,
}: HorsePathOptions) {
  const debug: Record<string, any> = {
    version: 'v0.7.14',
    input: { id, placement, totalHorses, spriteRadius, spacingPx },
  };

  if (
    !Array.isArray(innerBoundary) ||
    !Array.isArray(outerBoundary) ||
    !Array.isArray(centerline) ||
    innerBoundary.length !== outerBoundary.length
  ) {
    throw new Error(`generateHorsePathWithSpeed: invalid input boundaries`);
  }

  const {
    rotatedInner,
    rotatedOuter,
    rotatedCenterline,
    startIndex,
  } = computeTrackGeometry(innerBoundary, outerBoundary, centerline, startAt);

  debug.rotated = {
    startIndex,
    centerlineStart: rotatedCenterline[0],
    innerStart: rotatedInner[0],
    outerStart: rotatedOuter[0],
  };

  // 1. Use shared center lane for starting alignment
  const centerLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], 0.5)
  );
  const dx = centerLanePath[1].x - centerLanePath[0].x;
  const dy = centerLanePath[1].y - centerLanePath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) throw new Error(`generateHorsePathWithSpeed: invalid tangent`);
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;

  // 2. Shared base start point
  const baseStart = centerLanePath[0];

  // 3. Staggered vertical start point from center
  const offsetFromCenter = (placement - (totalHorses - 1) / 2) * (spriteRadius * 2 + spacingPx);
  const finalStartPoint = {
    x: baseStart.x + perpX * offsetFromCenter,
    y: baseStart.y + perpY * offsetFromCenter,
  };

  // 4. Instead of offsetting from center lane, interpolate an actual lane path for each horse
  let laneFrac = calculateLaneFraction(placement, totalHorses);
  laneFrac = Math.max(0.05, Math.min(0.95, laneFrac));
  const curvedLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], laneFrac)
  );

  debug.path = {
    laneFrac,
    offsetFromCenter,
    sharedStart: baseStart,
    tangent: { dx, dy, len },
  };

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts version: v0.7.14 (id: ${id}, placement: ${placement})`);
  console.log(`[KD] 🐎 startPoint=(${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[KD] ↕ laneFrac=${laneFrac.toFixed(3)} → direction=(${dirX.toFixed(3)}, ${dirY.toFixed(3)})`);

  return {
    path: curvedLanePath,
    startPoint: finalStartPoint,
    direction: { x: dirX, y: dirY },
    debug,
  };
}

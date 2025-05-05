// File: backend/utils/generateHorsePathWithSpeed.ts
// Version: v0.9.79 — Final fix: shared startPoint + tangent for true vertical stacking

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
    version: 'v0.9.79',
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

  // 1. Use center lane to compute shared tangent
  const centerLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], 0.5)
  );
  const dx = centerLanePath[1].x - centerLanePath[0].x;
  const dy = centerLanePath[1].y - centerLanePath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) throw new Error(`generateHorsePathWithSpeed: invalid center tangent`);
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;

  // 2. Use only center lane start point for all horses
  const baseStart = centerLanePath[0];

  // 3. Offset each horse from that one point
  const offsetFromCenter = (placement - (totalHorses - 1) / 2) * (spriteRadius * 2 + spacingPx);
  const finalStartPoint = {
    x: baseStart.x + perpX * offsetFromCenter,
    y: baseStart.y + perpY * offsetFromCenter,
  };

  // 4. Generate shared path (we'll still use full lanePath for animation)
  const horseLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], 0.5)
  );
  const offsetPath = horseLanePath.map(pt => ({
    x: pt.x + perpX * offsetFromCenter,
    y: pt.y + perpY * offsetFromCenter,
  }));

  debug.offset = {
    offsetFromCenter,
    perpX,
    perpY,
    sharedStart: baseStart,
    tangent: { dx, dy, len },
  };

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts version: v0.9.79 (id: ${id}, placement: ${placement})`);
  console.log(`[KD] 🔁 offsetFromCenter=${offsetFromCenter.toFixed(2)} → startPoint=(${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[KD] 🧭 shared tangent=(${dx.toFixed(2)}, ${dy.toFixed(2)}) → perp=(${perpX.toFixed(2)}, ${perpY.toFixed(2)})`);

  return {
    path: offsetPath,
    startPoint: finalStartPoint,
    direction: { x: dirX, y: dirY },
    debug,
  };
}

// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.7.16 — Expose rotatedCenterline for use in frontend debug overlay

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
    version: 'v0.7.16',
    input: { id, placement, totalHorses, spriteRadius, spacingPx },
  };

  if (
    !Array.isArray(innerBoundary) ||
    !Array.isArray(outerBoundary) ||
    !Array.isArray(centerline) ||
    innerBoundary.length !== outerBoundary.length
  ) {
    throw new Error('generateHorsePathWithSpeed: invalid input boundaries');
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

  // 1. Shared center lane for common tangent
  const centerLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], 0.5)
  );
  const dx = centerLanePath[1].x - centerLanePath[0].x;
  const dy = centerLanePath[1].y - centerLanePath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) throw new Error('generateHorsePathWithSpeed: invalid tangent');
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;

  // 2. Shared base start point
  const baseStart = centerLanePath[0];

  // 3. Offset vertically from center based on placement
  const offsetFromCenter = (placement - (totalHorses - 1) / 2) * (spriteRadius * 2 + spacingPx);
  const finalStartPoint = {
    x: baseStart.x + perpX * offsetFromCenter,
    y: baseStart.y + perpY * offsetFromCenter,
  };

  // 4. Generate unique path per horse using interpolated lane
  let laneFrac = calculateLaneFraction(placement, totalHorses);
  laneFrac = Math.max(0.05, Math.min(0.95, laneFrac)); // Padding from edges
  const curvedLanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], laneFrac)
  );

  debug.path = {
    laneFrac,
    offsetFromCenter,
    sharedStart: baseStart,
    tangent: { dx, dy, len },
  };

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts version: v0.7.16 (id: ${id}, placement: ${placement})`);
  console.log(`[KD] 🐎 startPoint=(${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[KD] ↕ laneFrac=${laneFrac.toFixed(3)} → direction=(${dirX.toFixed(3)}, ${dirY.toFixed(3)})`);

  return {
    path: curvedLanePath,
    startPoint: finalStartPoint,
    direction: { x: dirX, y: dirY },
    debug,
    rotatedCenterline, // Exposed for frontend visuals
  };
}

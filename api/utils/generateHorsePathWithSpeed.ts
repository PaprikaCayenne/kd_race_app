// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.7.17 — Use rotatedCenterline directly from backend, no recomputation

import { Point } from '@/types/geometry';
import calculateLaneFraction from './calculateLaneFraction';
import interpolateLanePoint from './interpolateLanePoint';

interface HorsePathOptions {
  id: number;
  innerBoundary: Point[];
  outerBoundary: Point[];
  rotatedCenterline: Point[];
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
  rotatedCenterline,
  startAt,
  startLineAt,
  totalHorses,
  placement,
  spriteRadius = 12,
  spacingPx = 6,
}: HorsePathOptions) {
  const debug: Record<string, any> = {
    version: 'v0.7.17',
    input: { id, placement, totalHorses, spriteRadius, spacingPx },
  };

  if (
    !Array.isArray(innerBoundary) ||
    !Array.isArray(outerBoundary) ||
    !Array.isArray(rotatedCenterline) ||
    innerBoundary.length !== outerBoundary.length
  ) {
    throw new Error('generateHorsePathWithSpeed: invalid input boundaries');
  }

  // 1. Shared center lane for common tangent
  const centerLanePath: Point[] = innerBoundary.map((inner, i) =>
    interpolateLanePoint(inner, outerBoundary[i], 0.5)
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
  laneFrac = Math.max(0.05, Math.min(0.95, laneFrac));
  const curvedLanePath: Point[] = innerBoundary.map((inner, i) =>
    interpolateLanePoint(inner, outerBoundary[i], laneFrac)
  );

  debug.path = {
    laneFrac,
    offsetFromCenter,
    sharedStart: baseStart,
    tangent: { dx, dy, len },
  };

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts version: v0.7.17 (id: ${id}, placement: ${placement})`);
  console.log(`[KD] 🐎 startPoint=(${finalStartPoint.x.toFixed(1)}, ${finalStartPoint.y.toFixed(1)})`);
  console.log(`[KD] ↕ laneFrac=${laneFrac.toFixed(3)} → direction=(${dirX.toFixed(3)}, ${dirY.toFixed(3)})`);

  return {
    path: curvedLanePath,
    startPoint: finalStartPoint,
    direction: { x: dirX, y: dirY },
    debug,
    rotatedCenterline, // ✅ Passed-in version, no recompute
  };
}

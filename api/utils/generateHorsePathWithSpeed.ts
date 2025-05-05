// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.9.76 — Uses lanePath tangent instead of startLine vector for accurate lateral placement

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
  startLineAt, // still passed in for future flexibility
  totalHorses,
  placement,
  spriteRadius = 12,
  spacingPx = 6,
}: HorsePathOptions) {
  const debug: Record<string, any> = {
    version: 'v0.9.76',
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

  const laneFrac = calculateLaneFraction(placement, totalHorses);
  debug.lane = { placement, laneFrac };

  const lanePath: Point[] = rotatedInner.map((inner, i) =>
    interpolateLanePoint(inner, rotatedOuter[i], laneFrac)
  );

  if (lanePath.length < 2) {
    throw new Error(`generateHorsePathWithSpeed: lane path too short`);
  }

  // Correct offset: use actual tangent of lanePath
  const dx = lanePath[1].x - lanePath[0].x;
  const dy = lanePath[1].y - lanePath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) throw new Error(`generateHorsePathWithSpeed: invalid tangent direction`);

  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;

  const offsetFromCenter = (placement - (totalHorses - 1) / 2) * (spriteRadius * 2 + spacingPx);
  debug.offset = { offsetFromCenter, perpX, perpY };

  const offsetPath = lanePath.map(pt => ({
    x: pt.x + perpX * offsetFromCenter,
    y: pt.y + perpY * offsetFromCenter,
  }));

  const first = offsetPath?.[0];
  if (
    !first ||
    typeof first.x !== 'number' ||
    typeof first.y !== 'number' ||
    !Number.isFinite(first.x) ||
    !Number.isFinite(first.y)
  ) {
    console.error('[KD] ❌ Invalid startPoint generated:', first, { debug });
    throw new Error('generateHorsePathWithSpeed: invalid startPoint (null or NaN)');
  }

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts version: v0.9.76 (id: ${id}, placement: ${placement})`);
  console.log(`[KD] 📐 Offset vector: perpX=${perpX.toFixed(3)}, perpY=${perpY.toFixed(3)}`);
  console.log(`[KD] 🐎 Final startPoint for horse ${id}: x=${first.x.toFixed(2)}, y=${first.y.toFixed(2)}`);

  return {
    path: offsetPath,
    startPoint: first,
    direction: { x: dirX, y: dirY },
    debug,
  };
}

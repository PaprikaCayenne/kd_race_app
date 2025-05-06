// File: api/utils/generateOffsetPathFromCenterline.ts
// Version: v0.1.0 — Generates offset path using tangent + perpendicular vector per point

import { Point } from '@/types/geometry';

/**
 * Given a centerline and an offset amount (positive = right, negative = left),
 * returns a new path offset perpendicular to the centerline.
 */
export function generateOffsetPathFromCenterline(centerline: Point[], offsetPx: number): Point[] {
  if (!Array.isArray(centerline) || centerline.length < 2) {
    throw new Error('generateOffsetPathFromCenterline: invalid centerline');
  }

  const offsetPath: Point[] = [];

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[i === 0 ? 0 : i - 1];
    const curr = centerline[i];
    const next = centerline[i === centerline.length - 1 ? i : i + 1];

    // Average tangent vector
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const avgDx = (dx1 + dx2) / 2;
    const avgDy = (dy1 + dy2) / 2;

    const len = Math.sqrt(avgDx * avgDx + avgDy * avgDy) || 1;
    const normDx = avgDx / len;
    const normDy = avgDy / len;

    // Perpendicular vector (rotated 90° CCW)
    const perpX = -normDy;
    const perpY = normDx;

    offsetPath.push({
      x: curr.x + perpX * offsetPx,
      y: curr.y + perpY * offsetPx,
    });
  }

  return offsetPath;
}

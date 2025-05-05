// File: api/utils/computeTrackGeometry.ts
// Version: v0.3.0 — Rotates all boundaries from startAt and clamps length to avoid mismatch

import { Point } from '../types';

/**
 * Rotates a path to start from a given index.
 */
function rotate<T>(arr: T[], startIdx: number): T[] {
  return [...arr.slice(startIdx), ...arr.slice(0, startIdx)];
}

/**
 * Finds the closest index in a path to a target point.
 */
function findClosestIndex(path: Point[], target: Point): number {
  let closestIndex = 0;
  let minDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - target.x;
    const dy = path[i].y - target.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }
  return closestIndex;
}

/**
 * Aligns and rotates inner, outer, and centerline arrays to start from startAt.
 */
export function computeTrackGeometry(
  inner: Point[],
  outer: Point[],
  centerline: Point[],
  startAt: Point
): {
  rotatedInner: Point[];
  rotatedOuter: Point[];
  rotatedCenterline: Point[];
  startIndex: number;
} {
  if (!Array.isArray(inner) || !Array.isArray(outer) || !Array.isArray(centerline)) {
    throw new Error('computeTrackGeometry: Invalid inputs');
  }

  const minLength = Math.min(inner.length, outer.length, centerline.length);
  const slicedInner = inner.slice(0, minLength);
  const slicedOuter = outer.slice(0, minLength);
  const slicedCenterline = centerline.slice(0, minLength);

  const startIndex = findClosestIndex(slicedCenterline, startAt);

  return {
    rotatedInner: rotate(slicedInner, startIndex),
    rotatedOuter: rotate(slicedOuter, startIndex),
    rotatedCenterline: rotate(slicedCenterline, startIndex),
    startIndex,
  };
}

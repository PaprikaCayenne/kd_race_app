// File: api/utils/computeTrackGeometry.ts
// Version: v0.3.2 — Adds debug log comparing startAt to rotated path start

import { Point } from '../types';

function rotate<T>(arr: T[], startIdx: number): T[] {
  return [...arr.slice(startIdx), ...arr.slice(0, startIdx)];
}

function closePath(path: Point[]): Point[] {
  const first = path[0];
  const last = path[path.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    return [...path, { ...first }];
  }
  return path;
}

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
  const rotatedCenterline = closePath(rotate(slicedCenterline, startIndex));

  const rotatedStart = rotatedCenterline[0];
  const dx = rotatedStart.x - startAt.x;
  const dy = rotatedStart.y - startAt.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  console.log(`[KD] 🧭 computeTrackGeometry.ts (v0.3.2): startAt=(${startAt.x.toFixed(1)}, ${startAt.y.toFixed(1)})`);
  console.log(`[KD] 🔄 Closest centerline point = (${rotatedStart.x.toFixed(1)}, ${rotatedStart.y.toFixed(1)}), dist=${dist.toFixed(2)}`);

  return {
    rotatedInner: closePath(rotate(slicedInner, startIndex)),
    rotatedOuter: closePath(rotate(slicedOuter, startIndex)),
    rotatedCenterline,
    startIndex,
  };
}

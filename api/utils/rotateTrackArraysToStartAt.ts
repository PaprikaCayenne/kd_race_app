// File: api/utils/rotateTrackArraysToStartAt.ts
// Version: v0.1.1 — Safely rotates inner/outer arrays to align with startAt

import { Point } from "../types";

/**
 * Rotates inner/outer arrays so that the closest point in innerBoundary to startAt is index 0.
 */
export default function rotateTrackArraysToStartAt(
  innerBoundary: Point[],
  outerBoundary: Point[],
  startAt: Point
): {
  rotatedInner: Point[];
  rotatedOuter: Point[];
  rotatedStartIdx: number;
} {
  if (!innerBoundary || !outerBoundary || !startAt) {
    throw new Error("[rotateTrackArraysToStartAt] ❌ Boundaries not provided");
  }

  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < innerBoundary.length; i++) {
    const dx = innerBoundary[i].x - startAt.x;
    const dy = innerBoundary[i].y - startAt.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }

  const rotatedInner = [
    ...innerBoundary.slice(closestIdx),
    ...innerBoundary.slice(0, closestIdx)
  ];
  const rotatedOuter = [
    ...outerBoundary.slice(closestIdx),
    ...outerBoundary.slice(0, closestIdx)
  ];

  return {
    rotatedInner,
    rotatedOuter,
    rotatedStartIdx: closestIdx
  };
}

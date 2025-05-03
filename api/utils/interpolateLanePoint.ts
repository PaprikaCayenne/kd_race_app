// File: api/utils/interpolateLanePoint.ts
// Version: v0.1.1 — Default export

import type { Point } from "@/types/geometry";

export default function interpolateLanePoint(
  inner: Point,
  outer: Point,
  fraction: number
): Point {
  return {
    x: inner.x + (outer.x - inner.x) * fraction,
    y: inner.y + (outer.y - inner.y) * fraction
  };
}

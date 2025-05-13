// File: backend/src/utils/utils.ts
// Version: v1.0.0 — Basic shared utilities for track math

import { Point } from './types';

export function computeSegmentLength(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

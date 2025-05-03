// File: shared/utils/calculateFrontOffsetPoint.ts
// Version: v0.1.0 — Calculates offset point behind the start line using sprite width and track direction

import type { Point } from "@/types/geometry";

/**
 * Returns a point offset backward from the start line along the track direction vector.
 * Used to align the front tip of the horse sprite behind the start line.
 *
 * @param startPoint Where the horse's front should be
 * @param direction Normalized direction vector of the track at that point
 * @param spriteWidth Width of the horse sprite (used to estimate front offset)
 */
export default function calculateFrontOffsetPoint(
  startPoint: Point,
  direction: Point,
  spriteWidth: number
): Point {
  const offsetDistance = spriteWidth / 2;
  return {
    x: startPoint.x - direction.x * offsetDistance,
    y: startPoint.y - direction.y * offsetDistance
  };
}

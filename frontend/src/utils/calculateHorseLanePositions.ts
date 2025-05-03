// File: frontend/src/utils/calculateHorseLanePositions.ts
// Version: v0.1.0 — Compute dynamic horse lane center points based on sprite size

import { Sprite } from "pixi.js";

/**
 * Dynamically calculate horizontal lane positions based on sprite width and total track width.
 * Ensures equal spacing between horses and buffer on both sides.
 */
export function calculateHorseLanePositions(
  sprite: Sprite,
  trackWidth: number,
  laneCount: number,
  minEdgePadding = 10
): number[] {
  const bounds = sprite.getLocalBounds(); // Assumes sprite already created
  const spriteWidth = bounds.width;

  const totalHorseWidth = spriteWidth * laneCount;
  const availablePadding = trackWidth - totalHorseWidth;

  const edgePadding = Math.max(minEdgePadding, availablePadding / (laneCount + 1));
  const laneSpacing = spriteWidth + edgePadding;

  const positions: number[] = [];

  for (let i = 0; i < laneCount; i++) {
    const centerX = edgePadding + spriteWidth / 2 + i * laneSpacing;
    positions.push(centerX);
  }

  return positions;
}

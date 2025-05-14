// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.3.4 — Ensures horses are offset correctly and lanes fall within visible track boundaries

import { generateOffsetLanes } from './generateOffsetLanes';

/**
 * Generate full-length visible paths per horse. No slicing. All paths fall within visible track bounds.
 */
export function generateHorsePaths({
  horses,
  width = 1000,
  height = 600,
  laneWidth = 30,
  laneCount = 4,
  cornerRadius = 200,
  spriteWidth = 40,
}) {
  const { lanes } = generateOffsetLanes({
    width,
    height,
    cornerRadius,
    laneWidth,
    laneCount,
    offsetX: 0,
    offsetY: 0
  });

  const horsePaths = {};

  horses.forEach((horse, i) => {
    const laneIndex = i % lanes.length;
    const path = lanes[laneIndex];

    // Apply directional offset to path[0] only
    const offsetDistance = spriteWidth * 0.5;
    const p0 = path[0];
    const p1 = path[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const adjustedStart = {
      x: p0.x - dirX * offsetDistance,
      y: p0.y - dirY * offsetDistance,
    };

    const adjustedPath = [adjustedStart, ...path];

    horsePaths[horse.id] = {
      path: adjustedPath,
      laneIndex,
    };
  });

  return horsePaths;
}
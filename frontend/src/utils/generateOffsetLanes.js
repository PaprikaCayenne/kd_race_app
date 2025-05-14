// File: frontend/src/utils/generateOffsetLanes.js
// Version: v1.0.1 — Forwards offsetX and offsetY to center track layout

import { generateTrackPathWithRoundedCorners } from './generateTrackPathWithRoundedCorners';

/**
 * Given the centerline path, offset it left/right to generate parallel lanes.
 * Assumes lane 0 is centerline, lanes ±1, ±2, etc. offset by laneWidth.
 */
export function generateOffsetLanes({ width, height, cornerRadius, laneWidth, laneCount, offsetX = 0, offsetY = 0 }) {
  const centerline = generateTrackPathWithRoundedCorners({
    width,
    height,
    cornerRadius,
    segmentsPerCurve: 24,
    offsetX,
    offsetY
  });

  const lanes = [];

  for (let i = 0; i < laneCount; i++) {
    const offset = (i - Math.floor(laneCount / 2)) * laneWidth;
    const lanePath = [];

    for (let j = 0; j < centerline.length; j++) {
      const curr = centerline[j];
      const next = centerline[(j + 1) % centerline.length];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.sqrt(dx ** 2 + dy ** 2);
      const nx = -dy / len;
      const ny = dx / len;

      lanePath.push({
        x: curr.x + nx * offset,
        y: curr.y + ny * offset
      });
    }

    lanes.push(lanePath);
  }

  return { lanes, centerline };
}
// File: api/utils/generateOffsetLanes.ts
// Version: v0.1.2 — Logs first 150 points of Lane 1 & 2 to debug curve flip

import { Point } from '../types';

/**
 * Generates multiple offset lanes from a centerline using perpendicular normals.
 * 
 * @param centerline - Array of centerline points (must be closed path)
 * @param laneOffsets - Array of pixel offsets (positive = right, negative = left)
 * @returns Array of lane paths, one per offset
 */
export function generateOffsetLanes(centerline: Point[], laneOffsets: number[]): Point[][] {
  if (centerline.length < 2) throw new Error('generateOffsetLanes: centerline too short');

  const lanes: Point[][] = laneOffsets.map(() => []);

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[(i - 1 + centerline.length) % centerline.length];
    const next = centerline[(i + 1) % centerline.length];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / len;
    const unitY = dy / len;

    // Perpendicular normal (right-hand rule)
    const normalX = -unitY;
    const normalY = unitX;

    laneOffsets.forEach((offset, laneIndex) => {
      lanes[laneIndex].push({
        x: centerline[i].x + normalX * offset,
        y: centerline[i].y + normalY * offset
      });
    });
  }

  // Ensure closed paths
  for (const lane of lanes) {
    const first = lane[0];
    const last = lane[lane.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      lane.push({ ...first });
    }
  }

  return lanes;
}

// File: api/utils/generateHorsePaths.js
// Version: v0.2.1 – Prepare for backend race generation with structured output

import { generateRoundedRectCenterline } from './generateRoundedRectCenterline.js';
import { generateOffsetLane } from './generateOffsetLane.js';

/**
 * Generate structured paths for each horse given a track centerline.
 * Includes fallback track metadata for debugging or replays.
 *
 * @param {object} innerBounds – { x, y, width, height }
 * @param {number} cornerRadius – Radius of rounded rectangle corners
 * @param {number} horseCount – Number of horses to simulate
 * @param {number} laneWidth – Distance between horse paths (in px)
 * @returns {{ horsePaths: Record<string, Array<{ x: number, y: number }>>, trackMeta: object }}
 */
export function generateHorsePaths(innerBounds, cornerRadius, horseCount, laneWidth = 30) {
  const segments = 400;
  const centerline = generateRoundedRectCenterline(innerBounds, cornerRadius, segments);

  const horsePaths = {};
  for (let i = 0; i < horseCount; i++) {
    const horseId = `horse-${i + 1}`;
    const offset = (i - (horseCount - 1) / 2) * laneWidth;
    const lane = generateOffsetLane(centerline, offset);
    horsePaths[horseId] = lane;
  }

  const trackMeta = {
    centerline,
    horseCount,
    laneWidth,
    bounds: innerBounds,
    cornerRadius,
    segments
  };

  return { horsePaths, trackMeta };
}

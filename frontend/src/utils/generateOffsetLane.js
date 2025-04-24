// File: frontend/src/utils/generateOffsetLane.js
// Version: v0.1.1 – Generate multiple offset lanes for simulation

/**
 * Compute an offset version of a centerline for a given lane.
 * @param {Array<{x: number, y: number}>} centerline - Array of {x, y} points
 * @param {number} offset - Pixels to offset. Positive = outward, Negative = inward
 * @returns {Array<{x: number, y: number}>} Offset lane path
 */
export function generateOffsetLane(centerline, offset) {
    const offsetPath = [];
  
    for (let i = 0; i < centerline.length; i++) {
      const p1 = centerline[i];
      const p2 = centerline[(i + 1) % centerline.length];
  
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
  
      const normalX = -dy / length;
      const normalY = dx / length;
  
      offsetPath.push({
        x: p1.x + offset * normalX,
        y: p1.y + offset * normalY
      });
    }
  
    return offsetPath;
  }
  
  /**
   * Generate multiple offset lanes from a centerline.
   * @param {Array<{x: number, y: number}>} centerline
   * @param {number} laneCount - Number of total lanes
   * @param {number} laneWidth - Pixels between lanes
   * @returns {Array<Array<{x: number, y: number}>>} Array of lane paths
   */
  export function generateAllLanes(centerline, laneCount = 4, laneWidth = 30) {
    const mid = (laneCount - 1) / 2;
    const lanes = [];
    for (let i = 0; i < laneCount; i++) {
      const offset = (i - mid) * laneWidth;
      lanes.push(generateOffsetLane(centerline, offset));
    }
    return lanes;
  }
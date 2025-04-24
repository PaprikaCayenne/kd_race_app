// File: frontend/src/utils/generateHorsePaths.js
// Version: v0.1.0 – Generate one lap per horse along centerline path

/**
 * Generates lane paths for each horse by offsetting a base centerline path.
 * @param {Array<{x: number, y: number}>} basePath - The centerline path to follow.
 * @param {number} laneCount - Number of horses/lanes
 * @param {number} laneWidth - Width between lanes
 * @returns {Record<number, Array<{x: number, y: number}>>} horsePaths keyed by lane index
 */
export function generateHorsePaths(basePath, laneCount = 4, laneWidth = 30) {
    const horsePaths = {};
  
    for (let i = 0; i < laneCount; i++) {
      const offset = (i - (laneCount - 1) / 2) * laneWidth;
      const path = basePath.map((point, idx) => {
        const next = basePath[idx + 1] || point;
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len; // perpendicular x
        const ny = dx / len;  // perpendicular y
        return {
          x: point.x + nx * offset,
          y: point.y + ny * offset
        };
      });
      horsePaths[i] = path;
    }
  
    return horsePaths;
  }
  
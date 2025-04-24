// File: frontend/src/utils/generateOvalPath.js
// Version: v0.1.0 – Generate discretized oval track path points for animation

/**
 * Generate a discretized oval path for the race track.
 * The path consists of two semicircles connected by two straight segments.
 *
 * @param {number} cx - center X of the oval
 * @param {number} cy - center Y of the oval
 * @param {number} radiusX - horizontal radius (semi-major axis)
 * @param {number} radiusY - vertical radius (semi-minor axis)
 * @param {number} straightLength - length of the straight segments
 * @param {number} segments - number of points to generate along the path
 * @returns {Array<{x: number, y: number}>} Array of (x, y) points
 */
export function generateOvalPath(cx, cy, radiusX, radiusY, straightLength = 300, segments = 200) {
    const points = [];
    const halfSeg = Math.floor(segments / 2);
  
    // Semicircle left (top to bottom)
    for (let i = 0; i <= halfSeg; i++) {
      const angle = Math.PI / 2 + (Math.PI * i) / halfSeg;
      const x = cx - straightLength / 2 + radiusX * Math.cos(angle);
      const y = cy + radiusY * Math.sin(angle);
      points.push({ x, y });
    }
  
    // Straight segment bottom (left to right)
    for (let i = 1; i <= halfSeg; i++) {
      const x = cx - straightLength / 2 + (straightLength * i) / halfSeg;
      const y = cy + radiusY;
      points.push({ x, y });
    }
  
    // Semicircle right (bottom to top)
    for (let i = 0; i <= halfSeg; i++) {
      const angle = (3 * Math.PI) / 2 + (Math.PI * i) / halfSeg;
      const x = cx + straightLength / 2 + radiusX * Math.cos(angle);
      const y = cy + radiusY * Math.sin(angle);
      points.push({ x, y });
    }
  
    // Straight segment top (right to left)
    for (let i = 1; i <= halfSeg; i++) {
      const x = cx + straightLength / 2 - (straightLength * i) / halfSeg;
      const y = cy - radiusY;
      points.push({ x, y });
    }
  
    return points;
  }
  
// File: frontend/src/utils/generateOffsetLane.js
// Version: v0.3.0 — Distributes lanes evenly around centerline, spans full track width

/**
 * Offsets a centerline path by a fixed number of pixels using vector normals.
 * @param {Array<{x: number, y: number}>} centerline - base path
 * @param {number} offset - how far to offset (+ outward, - inward)
 * @returns {Array<{x: number, y: number}>}
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
 * Generate all lanes spaced evenly from centerline across full track thickness.
 * Boundary padding is already included in total track thickness.
 * @param {Array<{x: number, y: number}>} centerline
 * @param {number} laneCount
 * @param {number} laneWidth
 * @param {number} boundaryPadding — included in total width, not added again
 * @returns {Array<Array<{x: number, y: number}>>}
 */
export function generateAllLanes(centerline, laneCount = 4, laneWidth = 30, boundaryPadding = 0) {
  const lanes = [];

  // Total usable width = (laneWidth * laneCount) + 2 * boundaryPadding
  const totalLaneWidth = (laneCount * laneWidth) + (2 * boundaryPadding);
  const halfTrack = totalLaneWidth / 2;

  console.log('[KD] 🧭 Generating', laneCount, 'lanes across ±', halfTrack, 'px');

  // First lane offset = -halfTrack + laneWidth / 2
  for (let i = 0; i < laneCount; i++) {
    const offset = -halfTrack + boundaryPadding + (i + 0.5) * laneWidth;
    lanes.push(generateOffsetLane(centerline, offset));

    console.log(`[KD] 🧭 Lane ${i} offset: ${offset}`);
  }

  return lanes;
}

// File: frontend/src/utils/generateOffsetLane.js
// Version: v0.4.0 — Offsets from rotated centerline starting at 12 o’clock

/**
 * Offsets a centerline path by a fixed number of pixels using vector normals.
 * Assumes the centerline has already been rotated to start at the 12 o’clock position.
 * @param {Array<{x: number, y: number}>} centerline - base path (already rotated)
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
 * Generates all lanes spaced evenly around the rotated centerline.
 * Assumes centerline already starts at top-middle (12 o’clock).
 * @param {Array<{x: number, y: number}>} centerline
 * @param {number} laneCount
 * @param {number} laneWidth
 * @param {number} boundaryPadding
 * @returns {Array<Array<{x: number, y: number}>>}
 */
export function generateAllLanes(centerline, laneCount = 4, laneWidth = 30, boundaryPadding = 0) {
  const lanes = [];

  const totalLaneWidth = (laneCount * laneWidth) + (2 * boundaryPadding);
  const halfTrack = totalLaneWidth / 2;

  console.log(`[KD] 🧭 Generating ${laneCount} lanes around centerline starting at 12 o’clock`);
  console.log(`[KD] 🧭 Total width: ${totalLaneWidth}px (±${halfTrack}px from center)`);

  for (let i = 0; i < laneCount; i++) {
    const offset = -halfTrack + boundaryPadding + (i + 0.5) * laneWidth;
    console.log(`[KD] 🧭 Lane ${i} offset: ${offset.toFixed(1)}px`);
    lanes.push(generateOffsetLane(centerline, offset));
  }

  return lanes;
}

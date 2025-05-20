// File: frontend/src/utils/generateOffsetLane.js
// Version: v0.6.0 — Finalized 12 o’clock alignment logic with improved logs

/**
 * Offsets a centerline path by a fixed number of pixels using vector normals.
 * Then rotates the path so the closest point to true 12 o’clock becomes index [0].
 * @param {Array<{x: number, y: number}>} centerline - base path
 * @param {number} offset - lane offset in px (+ outward, - inward)
 * @param {{x: number, y: number}} twelveOclockRef - fixed canvas anchor
 * @returns {Array<{x: number, y: number}>}
 */
export function generateOffsetLane(centerline, offset, twelveOclockRef) {
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

  // 🔁 Rotate path so closest point to 12 o'clock anchor is at index 0
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < offsetPath.length; i++) {
    const pt = offsetPath[i];
    const dx = pt.x - twelveOclockRef.x;
    const dy = pt.y - twelveOclockRef.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDist) {
      bestDist = distSq;
      bestIdx = i;
    }
  }

  const rotatedPath = [
    ...offsetPath.slice(bestIdx),
    ...offsetPath.slice(0, bestIdx)
  ];

  const delta = Math.sqrt(bestDist);
  console.log(`[KD] ✅ generateOffsetLane(): snapped [0] to 12 o’clock → Δ=${delta.toFixed(2)}px`);

  return rotatedPath;
}

/**
 * Generates all lanes spaced evenly around the centerline and aligned to true 12 o’clock.
 * @param {Array<{x: number, y: number}>} centerline
 * @param {number} laneCount
 * @param {number} laneWidth
 * @param {number} boundaryPadding
 * @param {{x: number, y: number}} twelveOclockRef - fixed visual anchor
 * @returns {Array<Array<{x: number, y: number}>>}
 */
export function generateAllLanes(centerline, laneCount = 4, laneWidth = 30, boundaryPadding = 0, twelveOclockRef) {
  const lanes = [];

  const totalLaneWidth = (laneCount * laneWidth) + (2 * boundaryPadding);
  const halfTrack = totalLaneWidth / 2;

  console.log(`[KD] 🧭 Generating ${laneCount} lanes from centerline`);
  console.log(`[KD] 🧭 Total width: ${totalLaneWidth}px (±${halfTrack}px from center)`);
  console.log(`[KD] 📌 Reference 12 o’clock: (${twelveOclockRef.x.toFixed(1)}, ${twelveOclockRef.y.toFixed(1)})`);

  for (let i = 0; i < laneCount; i++) {
    const offset = -halfTrack + boundaryPadding + (i + 0.5) * laneWidth;
    console.log(`[KD] 🧭 Lane ${i} offset: ${offset.toFixed(1)}px`);
    lanes.push(generateOffsetLane(centerline, offset, twelveOclockRef));
  }

  return lanes;
}

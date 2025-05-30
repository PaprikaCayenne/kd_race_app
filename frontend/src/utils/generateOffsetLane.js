// File: frontend/src/utils/generateOffsetLane.js
// Version: v0.7.0 — Fixes normal discontinuity using forward vector smoothing

/**
 * Offsets a centerline path by a fixed number of pixels using smoothed vector normals.
 * Then rotates the path so the closest point to true 12 o’clock becomes index [0].
 * @param {Array<{x: number, y: number}>} centerline - base path
 * @param {number} offset - lane offset in px (+ outward, - inward)
 * @param {{x: number, y: number}} twelveOclockRef - fixed canvas anchor
 * @returns {Array<{x: number, y: number}>}
 */
export function generateOffsetLane(centerline, offset, twelveOclockRef) {
  const offsetPath = [];
  let prevAngle = null;

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[(i - 1 + centerline.length) % centerline.length];
    const next = centerline[(i + 1) % centerline.length];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;

    let angle = Math.atan2(dy, dx);

    // 🔁 Smooth angle to preserve continuity
    if (prevAngle !== null) {
      while (angle - prevAngle > Math.PI) angle -= 2 * Math.PI;
      while (angle - prevAngle < -Math.PI) angle += 2 * Math.PI;
    }
    prevAngle = angle;

    const normalAngle = angle + Math.PI / 2;
    const normalX = Math.cos(normalAngle);
    const normalY = Math.sin(normalAngle);

    const pt = centerline[i];
    offsetPath.push({
      x: pt.x + offset * normalX,
      y: pt.y + offset * normalY
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

  for (let i = 0; i < laneCount; i++) {
    const offset = -halfTrack + boundaryPadding + (i + 0.5) * laneWidth;
    lanes.push(generateOffsetLane(centerline, offset, twelveOclockRef));
  }

  return lanes;
}

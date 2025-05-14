// File: api/utils/generateOffsetLanes.ts
// Version: v0.4.8 — Adds guard for duplicate end points causing normal flip

import { Point } from '../types';

export function generateOffsetLanes(centerlineRaw: Point[], laneOffsets: number[]): Point[][] {
  if (centerlineRaw.length < 2) throw new Error('generateOffsetLanes: centerline too short');

  // 🧼 Step 1: Filter out duplicate or near-overlapping points
  const centerline: Point[] = [centerlineRaw[0]];
  for (let i = 1; i < centerlineRaw.length; i++) {
    const prev = centerline[centerline.length - 1];
    const curr = centerlineRaw[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= 1) {
      centerline.push(curr);
    } else {
      console.warn(`[KD] ⚠️ Removed redundant centerline point at index ${i} (dist=${dist.toFixed(4)})`);
    }
  }

  // 🧼 Step 2: Prevent false loopback point duplicating the start (often causes flip)
  const first = centerline[0];
  const last = centerline[centerline.length - 1];
  if (Math.abs(first.x - last.x) < 1 && Math.abs(first.y - last.y) < 1) {
    centerline.pop();
    console.warn('[KD] 🧽 Removed final point matching first to avoid seam discontinuity');
  }

  const lanes: Point[][] = laneOffsets.map(() => []);
  let prevAngle: number | null = null;

  for (let i = 0; i < centerline.length; i++) {
    const prev = centerline[(i - 1 + centerline.length) % centerline.length];
    const next = centerline[(i + 1) % centerline.length];

    const dx1 = centerline[i].x - prev.x;
    const dy1 = centerline[i].y - prev.y;
    const dx2 = next.x - centerline[i].x;
    const dy2 = next.y - centerline[i].y;
    const avgDx = (dx1 + dx2) / 2;
    const avgDy = (dy1 + dy2) / 2;
    let angle = Math.atan2(avgDy, avgDx);

    // 🔁 Normalize angle continuity to prevent flipping
    if (prevAngle !== null) {
      while (angle - prevAngle > Math.PI) angle -= 2 * Math.PI;
      while (angle - prevAngle < -Math.PI) angle += 2 * Math.PI;
    }
    prevAngle = angle;

    const normalAngle = angle + Math.PI / 2;
    const normalX = Math.cos(normalAngle);
    const normalY = Math.sin(normalAngle);

    const curr = centerline[i];
    laneOffsets.forEach((offset, laneIndex) => {
      lanes[laneIndex].push({
        x: curr.x + normalX * offset,
        y: curr.y + normalY * offset,
      });
    });
  }

  // 🧵 Close each lane loop explicitly
  for (const lane of lanes) {
    const first = lane[0];
    const last = lane[lane.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      lane.push({ ...first });
    }
  }

  return lanes;
}

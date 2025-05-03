// File: api/utils/computeTrackGeometry.ts
// Version: v0.1.0 — Adds distance and curvature arrays to a centerline path

import { Point } from "../types";

interface TrackGeometry {
  centerline: Point[];
  distance: number[];
  curvature: number[];
}

/**
 * Computes distance[] and curvature[] for a given centerline path.
 * - distance[i] = cumulative length from point 0 to i
 * - curvature[i] = angle difference (radians) between i-1→i and i→i+1
 */
export function computeTrackGeometry(centerline: Point[]): TrackGeometry {
  const N = centerline.length;
  const distance: number[] = new Array(N).fill(0);
  const curvature: number[] = new Array(N).fill(0);

  let totalDist = 0;

  for (let i = 1; i < N; i++) {
    const dx = centerline[i].x - centerline[i - 1].x;
    const dy = centerline[i].y - centerline[i - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    totalDist += dist;
    distance[i] = totalDist;
  }

  for (let i = 1; i < N - 1; i++) {
    const p0 = centerline[i - 1];
    const p1 = centerline[i];
    const p2 = centerline[i + 1];

    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    curvature[i] = angle;
  }

  return {
    centerline,
    distance,
    curvature
  };
}

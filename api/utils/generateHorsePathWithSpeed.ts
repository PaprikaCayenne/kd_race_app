// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.2.2 – Ensure backend-safe, remove PixiJS import

import fs from 'fs';
import path from 'path';
import { Point } from '../types';

export type PathPoint = {
  x: number;
  y: number;
  speed: number;
};

interface GenerateOptions {
  laneCount: number;
  laneSpacing?: number;
  debug?: boolean;
  debugOutputPath?: string;
  startAt?: { x: number; y: number };
}

export function generateHorsePathWithSpeed(
  centerline: Point[],
  options: GenerateOptions
): Record<number, PathPoint[]> {
  const laneCount = options.laneCount;
  const spacing = options.laneSpacing ?? 30;
  const pathByHorse: Record<number, PathPoint[]> = {};

  const rotatedCenterline = options.startAt
    ? rotateToClosestPoint(centerline, options.startAt)
    : centerline;

  for (let i = 0; i < laneCount; i++) {
    const offset = (i - (laneCount - 1) / 2) * spacing;
    const lane = offsetLane(rotatedCenterline, offset);
    const smoothed = catmullRomSpline(lane);
    const withSpeed = assignSpeed(smoothed);
    pathByHorse[i] = withSpeed;
  }

  if (options.debug && options.debugOutputPath) {
    const debugPath = path.resolve(options.debugOutputPath);
    const debugDir = path.dirname(debugPath);
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    fs.writeFileSync(debugPath, JSON.stringify(pathByHorse, null, 2));
    console.log(`🐎 Path debug written to: ${debugPath}`);
  }

  return pathByHorse;
}

function rotateToClosestPoint(points: Point[], target: Point): Point[] {
  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - target.x;
    const dy = points[i].y - target.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }

  return [...points.slice(minIdx), ...points.slice(0, minIdx)];
}

function offsetLane(points: Point[], offset: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const normX = -dy / len;
    const normY = dx / len;
    result.push({
      x: points[i].x + normX * offset,
      y: points[i].y + normY * offset
    });
  }
  return result;
}

function catmullRomSpline(points: Point[]): Point[] {
  const tension = 0.5;
  const output: Point[] = [];
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const p0 = points[(i - 1 + len) % len];
    const p1 = points[i];
    const p2 = points[(i + 1) % len];
    const p3 = points[(i + 2) % len];

    for (let t = 0; t < 1; t += 0.05) {
      const t2 = t * t;
      const t3 = t2 * t;

      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t
        + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
        + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t
        + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
        + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      output.push({ x, y });
    }
  }

  return output;
}

function assignSpeed(path: Point[]): PathPoint[] {
  return path.map((pt, idx) => {
    const slowdown = getCornerSlowdownFactor(path, idx);
    const baseSpeed = 9;
    const extraSpeed = (1 - slowdown) * 3;
    return { ...pt, speed: baseSpeed + extraSpeed };
  });
}

function getCornerSlowdownFactor(path: Point[], i: number): number {
  const prev = path[(i - 1 + path.length) % path.length];
  const curr = path[i];
  const next = path[(i + 1) % path.length];

  const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
  const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
  const delta = Math.abs(angle2 - angle1);

  return Math.min(delta / Math.PI, 1);
}

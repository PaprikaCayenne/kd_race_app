// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.7.6 — Lane Offsets + Smoother Pathing (Prep for Catmull-Rom)

import fs from 'fs';
import path from 'path';
import { Point } from '../types';

export const KD_HORSE_PATH_GENERATOR_VERSION = 'v0.7.6';

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
  startAt?: Point;
  innerBoundary?: Point[];
  outerBoundary?: Point[];
  spriteRadius?: number;
}

export function generateHorsePathWithSpeed(
  centerline: Point[],
  options: GenerateOptions
): Record<number, PathPoint[]> {
  console.log(`[KD] 🛠 Horse Path Generator Version: ${KD_HORSE_PATH_GENERATOR_VERSION}`);

  const laneCount = options.laneCount;
  const pathByHorse: Record<number, PathPoint[]> = {};

  console.log(`[KD] Inner boundary points: ${options.innerBoundary?.length || 0}`);
  console.log(`[KD] Outer boundary points: ${options.outerBoundary?.length || 0}`);

  if (!options.innerBoundary || !options.outerBoundary) {
    throw new Error('Inner and outer boundaries are required for horse path generation');
  }
  if (options.innerBoundary.length !== options.outerBoundary.length) {
    throw new Error('Inner and outer boundaries must have matching point counts');
  }

  const innerBoundary = options.innerBoundary;
  const outerBoundary = options.outerBoundary;
  const usableLength = innerBoundary.length;

  for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
    const path: PathPoint[] = [];

    // Slight tweak: Instead of uniform, stagger spacing a little
    const laneFraction = (laneIndex + 1) / (laneCount + 1);

    for (let i = 0; i < usableLength; i++) {
      const inner = innerBoundary[i];
      const outer = outerBoundary[i];

      const dx = outer.x - inner.x;
      const dy = outer.y - inner.y;

      const x = inner.x + dx * laneFraction;
      const y = inner.y + dy * laneFraction;

      path.push({
        x,
        y,
        speed: 8
      });
    }

    pathByHorse[laneIndex] = path;
  }

  if (options.debug && options.debugOutputPath) {
    const debugPath = path.resolve(options.debugOutputPath);
    const debugDir = path.dirname(debugPath);
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    fs.writeFileSync(debugPath, JSON.stringify(pathByHorse, null, 2));
    console.log(`🏏 Path debug written to: ${debugPath}`);
  }

  return pathByHorse;
}

// --- Optional Future Smoother (Not activated yet) ---
function catmullRomSpline(points: Point[]): Point[] {
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

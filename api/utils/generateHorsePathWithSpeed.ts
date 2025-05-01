// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.8.3 — Correct rotation to align paths and startPoint with startAt

import fs from 'fs';
import path from 'path';
import { Point } from '../types';

export const KD_HORSE_PATH_GENERATOR_VERSION = 'v0.8.3';

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

function findClosestIndex(points: Point[], target: Point): number {
  let minDist = Infinity;
  let closestIdx = 0;
  points.forEach((p, i) => {
    const dx = p.x - target.x;
    const dy = p.y - target.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDist) {
      minDist = distSq;
      closestIdx = i;
    }
  });
  return closestIdx;
}

function rotatePoints<T>(arr: T[], startIdx: number): T[] {
  return [...arr.slice(startIdx), ...arr.slice(0, startIdx)];
}

export function generateHorsePathWithSpeed(
  centerline: Point[],
  options: GenerateOptions
): { path: PathPoint[]; startPoint: PathPoint }[] {
  console.log(`[KD] 🛠 Horse Path Generator Version: ${KD_HORSE_PATH_GENERATOR_VERSION}`);

  const laneCount = options.laneCount;
  const output: { path: PathPoint[]; startPoint: PathPoint }[] = [];

  if (!options.innerBoundary || !options.outerBoundary || !options.startAt) {
    throw new Error('Missing required track boundaries or startAt');
  }
  if (options.innerBoundary.length !== options.outerBoundary.length) {
    throw new Error('Inner and outer boundaries must have equal point counts');
  }

  const innerBoundary = [...options.innerBoundary];
  const outerBoundary = [...options.outerBoundary];

  const startIdx = findClosestIndex(innerBoundary, options.startAt);
  console.log(`[KD] 🔁 Rotating inner/outer paths to start at index ${startIdx}`);

  const rotatedInner = rotatePoints(innerBoundary, startIdx);
  const rotatedOuter = rotatePoints(outerBoundary, startIdx);
  const usableLength = rotatedInner.length;

  for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
    const path: PathPoint[] = [];

    const laneFraction = (laneIndex + 1) / (laneCount + 1);

    for (let i = 0; i < usableLength; i++) {
      const inner = rotatedInner[i];
      const outer = rotatedOuter[i];
      const dx = outer.x - inner.x;
      const dy = outer.y - inner.y;

      const x = inner.x + dx * laneFraction;
      const y = inner.y + dy * laneFraction;

      path.push({ x, y, speed: 8 });
    }

    output.push({
      path,
      startPoint: path[0]
    });
  }

  if (options.debug && options.debugOutputPath) {
    const debugPath = path.resolve(options.debugOutputPath);
    const debugDir = path.dirname(debugPath);
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    fs.writeFileSync(debugPath, JSON.stringify(output, null, 2));
    console.log(`🏏 Path debug written to: ${debugPath}`);
  }

  return output;
}

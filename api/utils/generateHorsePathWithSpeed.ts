// File: backend/src/utils/generateHorsePathWithSpeed.ts
// Version: v1.0.9 — Trims path to return to start point after full lap instead of hard 1000 units

import { Point } from './types';
import { rotateTrackToStart } from './rotateTrack';
import { offsetLane } from './offsetLane';
import { computeSegmentLength } from './utils';
import { getPathLength } from './measurePath';

interface HorsePathOptions {
  horseId: string;
  placement: number;
  totalHorses: number;
  spriteRadius?: number;
  pathData: {
    startPoint: Point;
    path: Point[];
    direction: { x: number; y: number };
  };
}

const RETURN_THRESHOLD_SQ = 16; // 4px radius

export function generateHorsePathWithSpeed({
  horseId,
  placement,
  totalHorses,
  spriteRadius = 12,
  pathData
}: HorsePathOptions) {
  let { startPoint, path, direction } = pathData;

  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('generateHorsePathWithSpeed: invalid precomputed path');
  }

  // Find the closest point index to startPoint
  let closestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - startPoint.x;
    const dy = path[i].y - startPoint.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }

  // Rotate the path so that it starts from closestIdx
  const rotatedPath = [...path.slice(closestIdx), ...path.slice(0, closestIdx)];
  const rotatedStartPoint = rotatedPath[0];

  const dx = rotatedPath[1].x - rotatedPath[0].x;
  const dy = rotatedPath[1].y - rotatedPath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirLaneX = dx / len;
  const dirLaneY = dy / len;
  const dot = dirLaneX * direction.x + dirLaneY * direction.y;

  console.log(
    `[KD] 🧪 generateHorsePathWithSpeed.ts v1.0.9 — horseId=${horseId}, placement=${placement}, rotatedStart=(${rotatedStartPoint.x.toFixed(1)}, ${rotatedStartPoint.y.toFixed(1)}), originalStart=(${startPoint.x.toFixed(1)}, ${startPoint.y.toFixed(1)}), dot=${dot.toFixed(3)}`
  );

  const fullPath: Point[] = [];
  let hasLoopedBack = false;

  for (let i = 0; i < rotatedPath.length * 2 && !hasLoopedBack; i++) {
    const curr = rotatedPath[i % rotatedPath.length];
    fullPath.push(curr);

    const dx = curr.x - rotatedStartPoint.x;
    const dy = curr.y - rotatedStartPoint.y;
    const distSq = dx * dx + dy * dy;

    // Don't exit too early — must pass initial point after some progress
    if (i > 10 && distSq < RETURN_THRESHOLD_SQ) {
      hasLoopedBack = true;
    }
  }

  return {
    horseId,
    path: fullPath,
    startPoint: rotatedStartPoint,
    direction,
    debug: {
      version: 'v1.0.9',
      horseId,
      placement,
      rotatedFrom: closestIdx,
      rotatedStartPoint,
      originalStartPoint: startPoint,
      dot
    },
    rotatedCenterline: rotatedPath
  };
}

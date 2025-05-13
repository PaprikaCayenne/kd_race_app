// File: backend/src/utils/generateHorsePathWithSpeed.ts
// Version: v1.4.0 — Cleaned: removes random curve-based speed distortion; frontend controls pacing

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

const POST_FINISH_EXTRA_UNITS = 120;

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

  const rotatedPath = [...path.slice(closestIdx), ...path.slice(0, closestIdx)];
  const rotatedStartPoint = rotatedPath[0];

  const dx = rotatedPath[1].x - rotatedPath[0].x;
  const dy = rotatedPath[1].y - rotatedPath[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirLaneX = dx / len;
  const dirLaneY = dy / len;
  const dot = dirLaneX * direction.x + dirLaneY * direction.y;

  const fullPath: Point[] = [];
  const speedMap: number[] = [];
  let finishIndex = -1;
  let postFinishUnits = 0;
  const totalPathPoints = rotatedPath.length;

  for (let i = 0; i < rotatedPath.length * 3; i++) {
    const curr = rotatedPath[i % rotatedPath.length];
    fullPath.push(curr);

    let speedFactor = 1;

    if (i >= totalPathPoints && (i % totalPathPoints) === 0 && finishIndex === -1) {
      finishIndex = fullPath.length - 1;
    }

    if (finishIndex === -1) {
      speedFactor = 1; // constant pacing — curve drama now controlled in playRace.js
    } else {
      postFinishUnits++;
      if (postFinishUnits < POST_FINISH_EXTRA_UNITS) {
        const fade = 1 - postFinishUnits / POST_FINISH_EXTRA_UNITS;
        speedFactor = fade;
      } else {
        speedFactor = 0;
        break;
      }
    }

    speedMap.push(speedFactor);
  }

  return {
    horseId,
    path: fullPath,
    speedMap,
    startPoint: rotatedStartPoint,
    direction,
    debug: {
      version: 'v1.4.0',
      horseId,
      placement,
      rotatedFrom: closestIdx,
      rotatedStartPoint,
      originalStartPoint: startPoint,
      dot,
      finishIndex
    },
    rotatedCenterline: rotatedPath
  };
}
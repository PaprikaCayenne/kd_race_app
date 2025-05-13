// File: backend/src/utils/generateHorsePathWithSpeed.ts
// Version: v1.3.5 — Adds momentum-aware deceleration after finish line crossing

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

const RETURN_THRESHOLD_SQ = 16;
const SPEED_VARIATION_CURVE = 0.90;
const SPEED_VARIATION_BOOST = 1.12;
const RANDOMNESS_SEED = Date.now();
const POST_FINISH_EXTRA_UNITS = 120; // extra path length for momentum

function seededRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

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

  console.log(
    `[KD] 🧪 generateHorsePathWithSpeed.ts v1.3.5 — horseId=${horseId}, placement=${placement}, rotatedStart=(${rotatedStartPoint.x.toFixed(1)}, ${rotatedStartPoint.y.toFixed(1)}), originalStart=(${startPoint.x.toFixed(1)}, ${startPoint.y.toFixed(1)}), dot=${dot.toFixed(3)}`
  );

  const fullPath: Point[] = [];
  const speedMap: number[] = [];
  let prevAngle = 0;
  let finishIndex = -1;
  let postFinishUnits = 0;
  const totalPathPoints = rotatedPath.length;
  const baseHorseSpeed = 0.88 + seededRandom(RANDOMNESS_SEED + parseInt(horseId)) * 0.22;

  for (let i = 0; i < rotatedPath.length * 3; i++) {
    const curr = rotatedPath[i % rotatedPath.length];
    fullPath.push(curr);

    const next = rotatedPath[(i + 1) % rotatedPath.length];
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const angle = Math.atan2(dy, dx);
    let dAngle = Math.abs(angle - prevAngle);
    if (dAngle > Math.PI) dAngle = Math.abs(dAngle - 2 * Math.PI);
    prevAngle = angle;

    let speedFactor = baseHorseSpeed;

    // ✅ Mark finish after 1 full lap
    if (i >= totalPathPoints && (i % totalPathPoints) === 0 && finishIndex === -1) {
      finishIndex = fullPath.length - 1;
    }

    if (finishIndex === -1) {
      const rng = seededRandom(RANDOMNESS_SEED + parseInt(horseId) * 1000 + i);
      if (rng > 0.985) speedFactor *= 1.05 + rng * 0.03;
      else if (rng < 0.015) speedFactor *= 0.92 - rng * 0.05;

      if (dAngle > 0.3) speedFactor *= SPEED_VARIATION_CURVE - rng * 0.06;
      else if (dAngle < 0.04 && rng > 0.4) speedFactor *= SPEED_VARIATION_BOOST + rng * 0.04;
      else speedFactor *= 0.97 + rng * 0.06;
    } else {
      postFinishUnits++;
      if (postFinishUnits < POST_FINISH_EXTRA_UNITS) {
        const fade = 1 - postFinishUnits / POST_FINISH_EXTRA_UNITS;
        const rng = seededRandom(RANDOMNESS_SEED + parseInt(horseId) * 1000 + i);
        speedFactor *= 0.85 + rng * 0.1;
        speedFactor *= fade;
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
      version: 'v1.3.5',
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

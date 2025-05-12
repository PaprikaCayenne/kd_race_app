// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v1.0.4 — Uses precomputed lane paths by placement ID

import { Point } from '@/types/geometry';

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

export function generateHorsePathWithSpeed({
  horseId,
  placement,
  totalHorses,
  spriteRadius = 12,
  pathData
}: HorsePathOptions) {
  const { startPoint, path, direction } = pathData;

  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('generateHorsePathWithSpeed: invalid precomputed path');
  }

  const dx = path[1].x - path[0].x;
  const dy = path[1].y - path[0].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const dirLaneX = dx / len;
  const dirLaneY = dy / len;
  const dot = dirLaneX * direction.x + dirLaneY * direction.y;

  console.log(
    `[KD] 🧪 generateHorsePathWithSpeed.ts v1.0.4 — horseId=${horseId}, placement=${placement}, dot=${dot.toFixed(3)}`
  );

  return {
    horseId,
    path,
    startPoint,
    direction,
    debug: {
      version: 'v1.0.4',
      horseId,
      placement,
      startPoint,
      dot
    },
    rotatedCenterline: path
  };
}

const TRACK_WIDTH = 120;

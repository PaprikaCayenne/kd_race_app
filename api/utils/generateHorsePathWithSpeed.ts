// File: backend/utils/generateHorsePathWithSpeed.ts
// Version: v0.9.67 — Inlined fallback path generation if missing external dependency

import { Point } from '@/types/geometry';

interface HorsePathOptions {
  id: number;
  centerline: Point[];
  startIndex: number;
  totalHorses: number;
  spriteRadius?: number; // default to 12
  spacingPx?: number;    // default to 6
}

export function generateHorsePathWithSpeed({
  id,
  centerline,
  startIndex,
  totalHorses,
  spriteRadius = 12,
  spacingPx = 6,
}: HorsePathOptions) {
  const basePath = generateHorsePath(centerline, startIndex);

  if (basePath.length < 2) {
    throw new Error(`Horse ${id} has insufficient path data`);
  }

  const start = basePath[0];
  const next = basePath[1];

  const dx = next.x - start.x;
  const dy = next.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const dirX = dx / len;
  const dirY = dy / len;

  // Get perpendicular vector (normalized)
  const perpX = -dirY;
  const perpY = dirX;

  // Calculate offset: center horses around middle lane
  const laneOffset = (id - (totalHorses - 1) / 2);
  const fullOffset = laneOffset * (spriteRadius * 2 + spacingPx);

  const offsetX = perpX * fullOffset;
  const offsetY = perpY * fullOffset;

  const offsetPath = basePath.map(pt => ({
    x: pt.x + offsetX,
    y: pt.y + offsetY,
  }));

  return {
    path: offsetPath,
    startPoint: offsetPath[0],
    direction: { x: dirX, y: dirY },
  };
}

// Fallback inline implementation — generates path from rotated centerline
function generateHorsePath(centerline: Point[], startIndex: number): Point[] {
  if (centerline.length === 0) return [];

  const rotated = [
    ...centerline.slice(startIndex),
    ...centerline.slice(0, startIndex),
  ];

  return rotated;
}

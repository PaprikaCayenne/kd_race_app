// File: api/utils/generateOvalPath.ts
// Version: v0.2.2 – Fix top-level import for seedrandom + support default export

import seedrandom from 'seedrandom';

interface OvalPathOptions {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  straightLength?: number;
  resolution?: number;
  seed?: string | null;
}

interface Point {
  x: number;
  y: number;
}

export default function generateOvalPath({
  centerX,
  centerY,
  radiusX,
  radiusY,
  straightLength = 300,
  resolution = 400,
  seed = null,
}: OvalPathOptions): Point[] {
  const rng = seed ? seedrandom(seed) : Math.random;

  const points: Point[] = [];
  const halfSeg = Math.floor(resolution / 2);

  // Semicircle (left turn)
  for (let i = 0; i <= halfSeg; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / halfSeg;
    const x = centerX - straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Straight (backstretch)
  for (let i = 1; i <= halfSeg; i++) {
    const x = centerX - straightLength / 2 + (straightLength * i) / halfSeg;
    const y = centerY + radiusY;
    points.push({ x, y });
  }

  // Semicircle (right turn)
  for (let i = 0; i <= halfSeg; i++) {
    const angle = (3 * Math.PI) / 2 + (Math.PI * i) / halfSeg;
    const x = centerX + straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Straight (homestretch)
  for (let i = 1; i <= halfSeg; i++) {
    const x = centerX + straightLength / 2 - (straightLength * i) / halfSeg;
    const y = centerY - radiusY;
    points.push({ x, y });
  }

  return points;
}

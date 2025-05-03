// File: api/utils/generateOvalPath.ts
// Version: v0.3.0 — Smoother spacing for centerline path with fixed curve and straight resolutions

import seedrandom from 'seedrandom';

interface OvalPathOptions {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  straightLength?: number;
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
  seed = null,
}: OvalPathOptions): Point[] {
  const rng = seed ? seedrandom(seed) : Math.random;

  const points: Point[] = [];

  // Resolution settings
  const CORNER_SEGMENT_STEP_DEG = 2.5; // finer curve spacing
  const STRAIGHT_SEGMENT_STEP_PX = 8;  // fixed distance between straight points

  const cornerSteps = Math.floor(180 / CORNER_SEGMENT_STEP_DEG);
  const straightSteps = Math.floor(straightLength / STRAIGHT_SEGMENT_STEP_PX);

  // Left semicircle
  for (let i = 0; i <= cornerSteps; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / cornerSteps;
    const x = centerX - straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Backstretch
  for (let i = 1; i <= straightSteps; i++) {
    const x = centerX - straightLength / 2 + (straightLength * i) / straightSteps;
    const y = centerY + radiusY;
    points.push({ x, y });
  }

  // Right semicircle
  for (let i = 0; i <= cornerSteps; i++) {
    const angle = (3 * Math.PI) / 2 + (Math.PI * i) / cornerSteps;
    const x = centerX + straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Homestretch
  for (let i = 1; i <= straightSteps; i++) {
    const x = centerX + straightLength / 2 - (straightLength * i) / straightSteps;
    const y = centerY - radiusY;
    points.push({ x, y });
  }

  return points;
}

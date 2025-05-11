// File: api/utils/generateGreyOvalTrack.ts
// Version: v0.8.0 — Fixed alignment with uniform-length paths and reliable centerline

import { Point } from '../types';

const SEGMENTS_PER_SIDE = 20;
const SEGMENTS_PER_CORNER = 10;
const TRACK_WIDTH = 120;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 60;
const START_LINE_OFFSET_PX = 30;

export function generateGreyOvalTrack(
  dimensions: { width: number; height: number },
  startAtPercent: number
): {
  innerBounds: { pointsArray: Point[] };
  outerBounds: { pointsArray: Point[] };
  centerline: Point[];
  startAt: Point;
  startLineAt: Point;
  startInnerPoint: Point;
  startOuterPoint: Point;
} {
  const { width, height } = dimensions;
  const paddingX = width * 0.05;
  const paddingY = height * 0.05;

  const outerX = paddingX;
  const outerY = paddingY;
  const outerW = width - 2 * paddingX;
  const outerH = height - 2 * paddingY;

  const innerX = outerX + TRACK_WIDTH;
  const innerY = outerY + TRACK_WIDTH;
  const innerW = outerW - 2 * TRACK_WIDTH;
  const innerH = outerH - 2 * TRACK_WIDTH;

  const outer = generateRoundedRectFixed(outerX, outerY, outerW, outerH, OUTER_RADIUS);
  const inner = generateRoundedRectFixed(innerX, innerY, innerW, innerH, INNER_RADIUS);

  const pointCount = Math.min(inner.length, outer.length);
  const innerAligned = inner.slice(0, pointCount);
  const outerAligned = outer.slice(0, pointCount);

  const centerline: Point[] = [];
  for (let i = 0; i < pointCount; i++) {
    centerline.push({
      x: (innerAligned[i].x + outerAligned[i].x) / 2,
      y: (innerAligned[i].y + outerAligned[i].y) / 2
    });
  }

  // Ensure all paths are closed
  if (centerline[0].x !== centerline.at(-1)?.x || centerline[0].y !== centerline.at(-1)?.y) {
    centerline.push({ ...centerline[0] });
  }
  if (innerAligned[0].x !== innerAligned.at(-1)?.x || innerAligned[0].y !== innerAligned.at(-1)?.y) {
    innerAligned.push({ ...innerAligned[0] });
  }
  if (outerAligned[0].x !== outerAligned.at(-1)?.x || outerAligned[0].y !== outerAligned.at(-1)?.y) {
    outerAligned.push({ ...outerAligned[0] });
  }

  const startIndex = Math.floor(centerline.length * startAtPercent);
  const startAt = centerline[startIndex];
  const next = centerline[(startIndex + 1) % centerline.length];

  const dx = next.x - startAt.x;
  const dy = next.y - startAt.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / len;
  const unitY = dy / len;

  const startLineAt: Point = {
    x: startAt.x + unitX * START_LINE_OFFSET_PX,
    y: startAt.y + unitY * START_LINE_OFFSET_PX
  };

  return {
    innerBounds: { pointsArray: innerAligned },
    outerBounds: { pointsArray: outerAligned },
    centerline,
    startAt,
    startLineAt,
    startInnerPoint: innerAligned[startIndex],
    startOuterPoint: outerAligned[startIndex]
  };
}

function generateRoundedRectFixed(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): Point[] {
  const points: Point[] = [];

  // Top side
  addStraightFixed(points, x + r, y, x + w - r, y, SEGMENTS_PER_SIDE);
  addArcFixed(points, x + w - r, y + r, r, 270, 360, SEGMENTS_PER_CORNER);

  // Right side
  addStraightFixed(points, x + w, y + r, x + w, y + h - r, SEGMENTS_PER_SIDE);
  addArcFixed(points, x + w - r, y + h - r, r, 0, 90, SEGMENTS_PER_CORNER);

  // Bottom side
  addStraightFixed(points, x + w - r, y + h, x + r, y + h, SEGMENTS_PER_SIDE);
  addArcFixed(points, x + r, y + h - r, r, 90, 180, SEGMENTS_PER_CORNER);

  // Left side
  addStraightFixed(points, x, y + h - r, x, y + r, SEGMENTS_PER_SIDE);
  addArcFixed(points, x + r, y + r, r, 180, 270, SEGMENTS_PER_CORNER);

  return points;
}

function addStraightFixed(
  points: Point[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: number
) {
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    });
  }
}

function addArcFixed(
  points: Point[],
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  segments: number
) {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const rad = startRad + (endRad - startRad) * t;
    points.push({
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    });
  }
}

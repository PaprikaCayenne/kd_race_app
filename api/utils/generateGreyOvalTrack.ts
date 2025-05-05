// File: api/utils/generateGreyOvalTrack.ts
// Version: v0.5.4 — Adds validation and logging for boundary generation and array safety

import { Point } from '../types';

const STRAIGHT_SEGMENT_STEP_PX = 8;
const CORNER_SEGMENT_STEP_DEG = 2.5;
const START_LINE_OFFSET_PX = 30;

export function generateGreyOvalTrack(
  dimensions: { width: number; height: number },
  startAtPercent: number
): {
  innerBounds: { x: number; y: number; width: number; height: number; pointsArray: Point[] };
  outerBounds: { x: number; y: number; width: number; height: number; pointsArray: Point[] };
  centerline: Point[];
  startAt: Point;
  startLineAt: Point;
  startInnerPoint: Point;
  startOuterPoint: Point;
} {
  const { width, height } = dimensions;

  const paddingX = width * 0.05;
  const paddingY = height * 0.05;

  const trackWidth = 120;
  const outerCornerRadius = 40;
  const innerCornerRadius = 80;

  const innerX = paddingX + trackWidth;
  const innerY = paddingY + trackWidth;
  const innerW = width - 2 * (paddingX + trackWidth);
  const innerH = height - 2 * (paddingY + trackWidth);

  const outerX = paddingX;
  const outerY = paddingY;
  const outerW = width - 2 * paddingX;
  const outerH = height - 2 * paddingY;

  // ✅ Log to validate dimensions
  console.log(`[KD] Track dimensions: innerW=${innerW}, innerH=${innerH}, outerW=${outerW}, outerH=${outerH}`);

  const outerBoundary = generateRoundedRectPoints(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  const innerBoundary = generateRoundedRectPoints(innerX, innerY, innerW, innerH, innerCornerRadius);

  if (!innerBoundary.length || !outerBoundary.length) {
    throw new Error(`generateGreyOvalTrack: inner or outer boundary failed to generate points — check radius vs width/height`);
  }

  const centerline: Point[] = [];
  for (let i = 0; i < Math.min(innerBoundary.length, outerBoundary.length); i++) {
    const inner = innerBoundary[i];
    const outer = outerBoundary[i];
    centerline.push({
      x: (inner.x + outer.x) / 2,
      y: (inner.y + outer.y) / 2
    });
  }

  if (!centerline.length) {
    throw new Error(`generateGreyOvalTrack: failed to generate centerline — no matching points`);
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

  const startInnerPoint = innerBoundary[startIndex];
  const startOuterPoint = outerBoundary[startIndex];

  return {
    innerBounds: { x: innerX, y: innerY, width: innerW, height: innerH, pointsArray: innerBoundary },
    outerBounds: { x: outerX, y: outerY, width: outerW, height: outerH, pointsArray: outerBoundary },
    centerline,
    startAt,
    startLineAt,
    startInnerPoint,
    startOuterPoint
  };
}

function generateRoundedRectPoints(
  x: number, y: number, w: number, h: number, cornerRadius: number
): Point[] {
  const points: Point[] = [];

  const arc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, clockwise = true) => {
    const step = clockwise ? CORNER_SEGMENT_STEP_DEG : -CORNER_SEGMENT_STEP_DEG;
    const dir = clockwise ? 1 : -1;
    if (clockwise && startDeg > endDeg) endDeg += 360;
    if (!clockwise && startDeg < endDeg) startDeg += 360;

    for (let angle = startDeg; clockwise ? angle <= endDeg : angle >= endDeg; angle += step * dir) {
      const rad = (angle * Math.PI) / 180;
      points.push({ x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r });
    }
  };

  const addStraight = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / STRAIGHT_SEGMENT_STEP_PX));
    for (let i = 0; i <= steps; i++) {
      points.push({ x: x1 + (dx * i) / steps, y: y1 + (dy * i) / steps });
    }
  };

  addStraight(x + cornerRadius, y, x + w - cornerRadius, y);
  arc(x + w - cornerRadius, y + cornerRadius, cornerRadius, 270, 360);
  addStraight(x + w, y + cornerRadius, x + w, y + h - cornerRadius);
  arc(x + w - cornerRadius, y + h - cornerRadius, cornerRadius, 0, 90);
  addStraight(x + w - cornerRadius, y + h, x + cornerRadius, y + h);
  arc(x + cornerRadius, y + h - cornerRadius, cornerRadius, 90, 180);
  addStraight(x, y + h - cornerRadius, x, y + cornerRadius);
  arc(x + cornerRadius, y + cornerRadius, cornerRadius, 180, 270);

  return points;
}

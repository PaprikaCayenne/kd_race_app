// File: frontend/src/utils/drawGreyOvalTrack.js
// Version: v0.3.0 — High-Density Matching Boundaries with Sampling

import { Graphics } from 'pixi.js';

// Internal constants for control
const STRAIGHT_SEGMENT_STEP_PX = 10;  // Distance between points on straight segments
const CORNER_SEGMENT_STEP_DEG = 5;    // Degrees between points on rounded corners

export function drawGreyOvalTrack(app, container) {
  const g = new Graphics();

  const width = container.clientWidth;
  const height = container.clientHeight;

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

  // Track fill
  g.beginFill(0x996633);
  g.drawRoundedRect(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  g.endFill();

  // Cut out inner section
  g.beginFill(0xd0f0e0);
  g.drawRoundedRect(innerX, innerY, innerW, innerH, innerCornerRadius);
  g.endFill();

  // White border lines
  g.lineStyle(3, 0xffffff);
  g.drawRoundedRect(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  g.drawRoundedRect(innerX, innerY, innerW, innerH, innerCornerRadius);

  app.stage.addChild(g);

  console.log('[KD] 📏 Track drawn (Derby shape v0.3.0):', {
    outer: { x: outerX, y: outerY, w: outerW, h: outerH },
    inner: { x: innerX, y: innerY, w: innerW, h: innerH }
  });

  // Generate points arrays
  const outerBoundary = generateRoundedRectPoints(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  const innerBoundary = generateRoundedRectPoints(innerX, innerY, innerW, innerH, innerCornerRadius);

  return {
    innerBounds: { x: innerX, y: innerY, width: innerW, height: innerH, pointsArray: innerBoundary },
    outerBounds: { x: outerX, y: outerY, width: outerW, height: outerH, pointsArray: outerBoundary }
  };
}

// --- Helpers ---

function generateRoundedRectPoints(x, y, w, h, cornerRadius) {
  const points = [];

  const arc = (cx, cy, r, startAngleDeg, endAngleDeg, clockwise = true) => {
    const step = clockwise ? CORNER_SEGMENT_STEP_DEG : -CORNER_SEGMENT_STEP_DEG;
    const dir = clockwise ? 1 : -1;
    if (clockwise && startAngleDeg > endAngleDeg) endAngleDeg += 360;
    if (!clockwise && startAngleDeg < endAngleDeg) startAngleDeg += 360;

    for (let angle = startAngleDeg; clockwise ? angle <= endAngleDeg : angle >= endAngleDeg; angle += step * dir) {
      const rad = (angle * Math.PI) / 180;
      points.push({
        x: cx + Math.cos(rad) * r,
        y: cy + Math.sin(rad) * r
      });
    }
  };

  const addStraight = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / STRAIGHT_SEGMENT_STEP_PX));
    for (let i = 0; i <= steps; i++) {
      points.push({
        x: x1 + (dx * i) / steps,
        y: y1 + (dy * i) / steps
      });
    }
  };

  // Top side (left to right)
  addStraight(x + cornerRadius, y, x + w - cornerRadius, y);
  // Top-right corner (90 to 0 degrees)
  arc(x + w - cornerRadius, y + cornerRadius, cornerRadius, 270, 360);
  // Right side (top to bottom)
  addStraight(x + w, y + cornerRadius, x + w, y + h - cornerRadius);
  // Bottom-right corner (0 to 90 degrees)
  arc(x + w - cornerRadius, y + h - cornerRadius, cornerRadius, 0, 90);
  // Bottom side (right to left)
  addStraight(x + w - cornerRadius, y + h, x + cornerRadius, y + h);
  // Bottom-left corner (90 to 180 degrees)
  arc(x + cornerRadius, y + h - cornerRadius, cornerRadius, 90, 180);
  // Left side (bottom to top)
  addStraight(x, y + h - cornerRadius, x, y + cornerRadius);
  // Top-left corner (180 to 270 degrees)
  arc(x + cornerRadius, y + cornerRadius, cornerRadius, 180, 270);

  return points;
}

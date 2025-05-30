// File: frontend/src/components/track/drawFinishLine.js
// Version: v1.0.0 — Renders stylized finish line and returns Graphics instance
// Date: 2025-05-29

import { Graphics } from 'pixi.js';

export function drawFinishLine({
  app,
  centerline,
  laneCount,
  laneWidth,
  boundaryPadding = 0,
  spriteWidth = 0
}) {
  const totalLaneWidth = (laneWidth * laneCount) + 2 * boundaryPadding;
  const halfLine = totalLaneWidth / 2;

  //const offset = spriteWidth / 2;
  const offset = 0;
  const seg0 = centerline.getPointAtDistance(offset);
  const seg1 = centerline.getPointAtDistance(offset + 1);

  const rotation = Math.atan2(seg1.y - seg0.y, seg1.x - seg0.x);
  const normal = { x: -Math.sin(rotation), y: Math.cos(rotation) };

  const finishA = {
    x: seg0.x + normal.x * halfLine,
    y: seg0.y + normal.y * halfLine
  };
  const finishB = {
    x: seg0.x - normal.x * halfLine,
    y: seg0.y - normal.y * halfLine
  };

  const line = new Graphics();
  line.lineStyle(4, 0xff0000); // Red finish line
  line.moveTo(finishA.x, finishA.y);
  line.lineTo(finishB.x, finishB.y);
  line.alpha = 0; // Start invisible
  line.zIndex = 100;
  app.stage.addChild(line);

  return line;
}

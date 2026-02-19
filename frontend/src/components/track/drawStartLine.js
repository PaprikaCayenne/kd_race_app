// File: frontend/src/components/track/drawStartLine.js
// Version: v1.1.0 — Draws a crisp green start line aligned to the track tangent
// Date: 2026-02-19

import { Graphics } from 'pixi.js';
import { getStartLineDistance } from '@/utils/raceMath';

export function drawStartLine({ app, centerline, laneCount, laneWidth, boundaryPadding = 0, startLineOffset = 0, spriteWidth = 0 }) {
  const totalLaneWidth = (laneWidth * laneCount) + (2 * boundaryPadding);
  const halfLine = totalLaneWidth / 2;

  const offset = getStartLineDistance(spriteWidth) + startLineOffset;
  const seg0 = centerline.getPointAtDistance(offset);
  const seg1 = centerline.getPointAtDistance(offset + 1);

  const rotation = Math.atan2(seg1.y - seg0.y, seg1.x - seg0.x);
  const normal = { x: -Math.sin(rotation), y: Math.cos(rotation) };

  const startA = {
    x: seg0.x + (normal.x * halfLine),
    y: seg0.y + (normal.y * halfLine)
  };
  const startB = {
    x: seg0.x - (normal.x * halfLine),
    y: seg0.y - (normal.y * halfLine)
  };

  const line = new Graphics();
  line.lineStyle(7, 0x0b5f1f, 0.92);
  line.moveTo(startA.x, startA.y);
  line.lineTo(startB.x, startB.y);

  line.lineStyle(4, 0x16a34a, 1);
  line.moveTo(startA.x, startA.y);
  line.lineTo(startB.x, startB.y);

  line.zIndex = 100;
  app.stage.addChild(line);

  return line;
}

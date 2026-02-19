// File: frontend/src/components/track/drawFinishLine.js
// Version: v1.2.0 — Draws a checkered finish line at the start-line offset for fade-in swap
// Date: 2026-02-19

import { Graphics } from 'pixi.js';
import { getStartLineDistance } from '@/utils/raceMath';

function drawCheckeredStrip(line, from, to, thickness = 8, tileLength = 8) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0) return;

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const tiles = Math.max(1, Math.ceil(length / tileLength));
  const halfThickness = thickness / 2;

  for (let i = 0; i < tiles; i += 1) {
    const startDist = i * tileLength;
    const endDist = Math.min(length, (i + 1) * tileLength);

    const sx = from.x + (ux * startDist);
    const sy = from.y + (uy * startDist);
    const ex = from.x + (ux * endDist);
    const ey = from.y + (uy * endDist);

    const fill = i % 2 === 0 ? 0xffffff : 0x111111;
    line.beginFill(fill, 0.98);
    line.drawPolygon([
      sx + (px * halfThickness), sy + (py * halfThickness),
      ex + (px * halfThickness), ey + (py * halfThickness),
      ex - (px * halfThickness), ey - (py * halfThickness),
      sx - (px * halfThickness), sy - (py * halfThickness)
    ]);
    line.endFill();
  }

  line.lineStyle(2, 0x000000, 0.65);
  line.moveTo(from.x + (px * halfThickness), from.y + (py * halfThickness));
  line.lineTo(to.x + (px * halfThickness), to.y + (py * halfThickness));
  line.moveTo(from.x - (px * halfThickness), from.y - (py * halfThickness));
  line.lineTo(to.x - (px * halfThickness), to.y - (py * halfThickness));
}

export function drawFinishLine({
  app,
  centerline,
  laneCount,
  laneWidth,
  boundaryPadding = 0,
  startLineOffset = 0,
  spriteWidth = 0
}) {
  const totalLaneWidth = (laneWidth * laneCount) + (2 * boundaryPadding);
  const halfLine = totalLaneWidth / 2;

  const offset = getStartLineDistance(spriteWidth) + startLineOffset;
  const seg0 = centerline.getPointAtDistance(offset);
  const seg1 = centerline.getPointAtDistance(offset + 1);

  const rotation = Math.atan2(seg1.y - seg0.y, seg1.x - seg0.x);
  const normal = { x: -Math.sin(rotation), y: Math.cos(rotation) };

  const finishA = {
    x: seg0.x + (normal.x * halfLine),
    y: seg0.y + (normal.y * halfLine)
  };
  const finishB = {
    x: seg0.x - (normal.x * halfLine),
    y: seg0.y - (normal.y * halfLine)
  };

  const line = new Graphics();
  drawCheckeredStrip(line, finishA, finishB, 8, 8);
  line.alpha = 0;
  line.zIndex = 100;
  app.stage.addChild(line);

  return line;
}

// File: frontend/src/utils/drawGreyOvalTrack.js
// Version: v0.1.8 – Migrate to pixi.js bundled import for track drawing

import { Graphics } from 'pixi.js';

export function drawGreyOvalTrack(app, container) {
  const g = new Graphics();

  const width = container.clientWidth;
  const height = container.clientHeight;

  const paddingX = width * 0.05;  // ~5% horizontal padding
  const paddingY = height * 0.05; // ~5% vertical padding

  const trackWidth = 120;
  const outerCornerRadius = 40;
  const innerCornerRadius = 80; // More rounded inner shape

  const innerX = paddingX + trackWidth;
  const innerY = paddingY + trackWidth;
  const innerW = width - 2 * (paddingX + trackWidth);
  const innerH = height - 2 * (paddingY + trackWidth);

  const outerX = paddingX;
  const outerY = paddingY;
  const outerW = width - 2 * paddingX;
  const outerH = height - 2 * paddingY;

  // Draw outer path
  g.beginFill(0x996633);
  g.drawRoundedRect(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  g.endFill();

  // Cut out inner track
  g.beginFill(0xd0f0e0);
  g.drawRoundedRect(innerX, innerY, innerW, innerH, innerCornerRadius);
  g.endFill();

  // White lines for track edges
  g.lineStyle(3, 0xffffff);
  g.drawRoundedRect(outerX, outerY, outerW, outerH, outerCornerRadius + trackWidth);
  g.drawRoundedRect(innerX, innerY, innerW, innerH, innerCornerRadius);

  // Add start line – only spans the brown section (left half between outer and inner bounds)
  const startLineY = outerY + outerH * 0.25; // same vertical offset
  const startLineX1 = outerX;
  const startLineX2 = innerX; // ends at inner edge

  g.lineStyle(4, 0xff0000);
  g.moveTo(startLineX1, startLineY);
  g.lineTo(startLineX2, startLineY);

  app.stage.addChild(g);

  console.log('[KD] 📏 Track drawn (Derby shape v0.1.8 + masked start line):', {
    outer: { x: outerX, y: outerY, w: outerW, h: outerH },
    inner: { x: innerX, y: innerY, w: innerW, h: innerH },
    startLine: { x1: startLineX1, x2: startLineX2, y: startLineY }
  });

  return {
    innerBounds: { x: innerX, y: innerY, width: innerW, height: innerH },
    outerBounds: { x: outerX, y: outerY, width: outerW, height: outerH },
    startLine: { x1: startLineX1, x2: startLineX2, y: startLineY }
  };
}

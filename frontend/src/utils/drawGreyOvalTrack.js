// File: frontend/src/utils/drawGreyOvalTrack.js
// Version: v0.1.9 – Remove legacy hardcoded start line

import { Graphics } from 'pixi.js';

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

  console.log('[KD] 📏 Track drawn (Derby shape v0.1.9):', {
    outer: { x: outerX, y: outerY, w: outerW, h: outerH },
    inner: { x: innerX, y: innerY, w: innerW, h: innerH }
  });

  return {
    innerBounds: { x: innerX, y: innerY, width: innerW, height: innerH },
    outerBounds: { x: outerX, y: outerY, width: outerW, height: outerH }
  };
}

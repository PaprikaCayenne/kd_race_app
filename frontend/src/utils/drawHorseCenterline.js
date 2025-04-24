// File: frontend/src/utils/drawHorseCenterline.js
// Version: v0.1.0 – Visual debug for centerline used in path generation

import { Graphics } from 'pixi.js';

/**
 * Draws a visual centerline on the track to confirm the base path.
 * @param {import('@pixi/app').Application} app - PixiJS application instance
 * @param {Array<{x: number, y: number}>} path - Array of points defining the centerline
 */
export function drawHorseCenterline(app, path) {
  const line = new Graphics();
  line.lineStyle(2, 0x00ffff);
  line.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    line.lineTo(path[i].x, path[i].y);
  }
  app.stage.addChild(line);
  console.log(`[KD] 🌀 Centerline drawn: ${path.length} points`);
}

// File: frontend/src/utils/renderPond.js
// Version: v0.4.1 — Uses smooth ellipse with dynamic size and smart boundary padding

import { Graphics } from 'pixi.js';

/**
 * Renders a rounded, padded pond inside the inner boundary area.
 * Calculates shape based on base size, but adapts with internal padding
 * so the pond stays well within the inner boundary visually.
 *
 * @param {PIXI.Application} app - The PIXI app
 * @param {{x: number, y: number}} center - Center point for the pond
 * @param {number} baseSize - Approximate base width of the pond
 */
export function renderPond(app, center, baseSize = 60) {
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') return;

  const padding = baseSize * 0.2; // 20% internal padding
  const pondWidth = baseSize * 2 - padding;
  const pondHeight = baseSize * 1.3 - padding;

  const pond = new Graphics();
  pond.beginFill(0x66ccff);
  pond.drawEllipse(center.x, center.y, pondWidth / 2, pondHeight / 2);
  pond.endFill();

  pond.zIndex = 0.5;
  app.stage.addChild(pond);
}

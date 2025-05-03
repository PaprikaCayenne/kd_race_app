// File: frontend/src/utils/renderPond.js
// Version: v0.2.0 — Position pond left-inside inner boundary using layout-aware anchor

import { Graphics } from 'pixi.js';
import { generatePondShape } from './generatePondShape';

/**
 * Renders the pond inside the inner boundary near top-left with padding.
 * @param {PIXI.Application} app
 * @param {Point[]} innerBoundary
 */
export function renderPond(app, innerBoundary) {
  if (!innerBoundary || innerBoundary.length < 1) return;

  // Compute bounding box of innerBoundary
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  innerBoundary.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  // Position pond offset slightly inside left and upward from center
  const pondOffsetX = 40;
  const pondOffsetY = 60;

  const anchorX = minX + pondOffsetX;
  const anchorY = minY + (maxY - minY) / 2 - pondOffsetY;

  const pond = new Graphics();
  const pondPoints = generatePondShape(anchorX, anchorY, 120, 80);

  pond.beginFill(0x66ccff).moveTo(pondPoints[0].x, pondPoints[0].y);
  pondPoints.forEach(p => pond.lineTo(p.x, p.y));
  pond.endFill();

  app.stage.addChild(pond);
}

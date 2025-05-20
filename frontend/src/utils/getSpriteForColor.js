// File: frontend/src/utils/getSpriteForColor.js
// Version: v1.1.0 — Accepts app param for texture generation

import { Graphics, Texture, Sprite } from 'pixi.js';

const spriteCache = new Map();

/**
 * Returns a triangle-shaped PIXI.Sprite filled with the specified hex color.
 * Uses memoization to avoid regenerating textures for the same color.
 * @param {number} colorHex - Hexadecimal color, e.g., 0xff0000
 * @param {PIXI.Application} app - The PixiJS application instance
 * @returns {PIXI.Sprite}
 */
export function getSpriteForColor(colorHex, app) {
  if (spriteCache.has(colorHex)) {
    return new Sprite(spriteCache.get(colorHex));
  }

  const gfx = new Graphics();
  gfx.beginFill(colorHex);
  gfx.drawPolygon([
    -10, 10,   // Bottom left
     10, 10,   // Bottom right
     0, -10    // Top center
  ]);
  gfx.endFill();

  const texture = app.renderer.generateTexture(gfx);
  spriteCache.set(colorHex, texture);
  return new Sprite(texture);
}

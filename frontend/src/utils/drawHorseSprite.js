// File: frontend/src/utils/drawHorseSprite.js
// Version: v1.1.0 — Enlarged pixel horse, drawn in-code with colored saddle

import { Graphics, Texture, Sprite } from 'pixi.js';

const spriteCache = new Map();

/**
 * Returns a PIXI.Sprite of a pixel-art style horse.
 * The horse body is dark brown, and the saddle is filled with the given hex color.
 * Uses memoization by color.
 * @param {number} colorHex - Saddle color in 0xff0000 format.
 * @param {PIXI.Application} app - The PixiJS application instance.
 * @returns {PIXI.Sprite}
 */
export function drawHorseSprite(colorHex, app) {
  if (spriteCache.has(colorHex)) {
    return new Sprite(spriteCache.get(colorHex));
  }

  const gfx = new Graphics();
  const bodyColor = 0x4b2e18; // Dark brown

  // --- Horse Body (enlarged) ---
  gfx.beginFill(bodyColor);
  gfx.drawRect(3, 6, 18, 9); // body: x=3, y=6, w=18, h=9
  gfx.endFill();

  // --- Legs (4 blocks) ---
  gfx.beginFill(bodyColor);
  gfx.drawRect(5, 15, 3, 6);   // Front-left
  gfx.drawRect(8, 15, 3, 6);   // Back-left
  gfx.drawRect(15, 15, 3, 6);  // Front-right
  gfx.drawRect(18, 15, 3, 6);  // Back-right
  gfx.endFill();

  // --- Saddle (larger square) ---
  gfx.beginFill(colorHex);
  gfx.drawRect(10, 8, 6, 5); // centered on body
  gfx.endFill();

  const texture = app.renderer.generateTexture(gfx);
  spriteCache.set(colorHex, texture);
  return new Sprite(texture);
}

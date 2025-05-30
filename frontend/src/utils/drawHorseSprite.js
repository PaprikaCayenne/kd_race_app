// File: frontend/src/utils/drawHorseSprite.js
// Version: v1.7.1 — Guards hex values to prevent .replace crash
// Date: 2025-05-27

import { Graphics, Texture, Sprite } from 'pixi.js';

const spriteCache = new Map();

/**
 * Returns a PIXI.Sprite of a pixel-art horse with customized colors.
 * @param {string} saddleHex - Saddle color in "#RRGGBB" format.
 * @param {string} bodyHex - Body color in "#RRGGBB" format.
 * @param {PIXI.Application} app - The PixiJS application instance.
 * @returns {PIXI.Sprite}
 */
export function drawHorseSprite(saddleHex, bodyHex, app) {
  const safeSaddle = typeof saddleHex === 'string' ? saddleHex.replace('#', '') : '000000';
  const safeBody = typeof bodyHex === 'string' ? bodyHex.replace('#', '') : '000000';

  const saddleColor = parseInt(safeSaddle, 16);
  const bodyColor = parseInt(safeBody, 16);
  const key = `${saddleColor}_${bodyColor}`;

  if (spriteCache.has(key)) {
    return new Sprite(spriteCache.get(key));
  }

  const gfx = new Graphics();
  const maneColor = 0x2a2a2a;
  const eyeColor = 0xffffff;

  // Tail
  gfx.beginFill(maneColor).drawRoundedRect(4, 16, 4, 9, 2).endFill();

  // Body
  gfx.beginFill(bodyColor).drawRoundedRect(10, 11, 26, 13, 4).endFill();

  // Saddle
  gfx.beginFill(saddleColor).drawRoundedRect(18, 13, 9, 6, 2).endFill();

  // Legs
  gfx.beginFill(bodyColor);
  gfx.drawRect(13, 23, 3, 7);
  gfx.drawRect(17, 23, 3, 7);
  gfx.drawRect(27, 23, 3, 7);
  gfx.drawRect(31, 23, 3, 7);
  gfx.endFill();

  // Neck
  gfx.beginFill(bodyColor).drawRect(34, 12, 3, 9).endFill();

  // Head
  gfx.beginFill(bodyColor);
  gfx.moveTo(37, 12);
  gfx.lineTo(44, 10);
  gfx.lineTo(44, 18);
  gfx.lineTo(37, 16);
  gfx.lineTo(37, 12);
  gfx.endFill();

  // Mane
  gfx.beginFill(maneColor).drawRect(37, 9, 2, 2).endFill();

  // Eye
  gfx.beginFill(eyeColor).drawRect(42, 12, 1, 1).endFill();

  const texture = app.renderer.generateTexture(gfx);
  spriteCache.set(key, texture);
  return new Sprite(texture);
}

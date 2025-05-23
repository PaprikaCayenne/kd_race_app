// File: frontend/src/utils/drawHorseSprite.js
// Version: v1.6.0 — Adds horse coat color variants based on `horse.variant`

import { Graphics, Texture, Sprite } from 'pixi.js';

const spriteCache = new Map();

/** Variant color map */
const VARIANT_COLORS = {
  bay: {
    body: 0x5c3a1a,
    mane: 0x3a2312,
  },
  chestnut: {
    body: 0xa0522d,
    mane: 0x5c3a1a,
  },
  palomino: {
    body: 0xe6c27a,
    mane: 0xcaa04e,
  },
  black: {
    body: 0x2b2b2b,
    mane: 0x1a1a1a,
  }
};

/**
 * Returns a PIXI.Sprite of a pixel-art horse with Stardew-style silhouette and coat variant.
 * @param {number} colorHex - Saddle color in 0xff0000 format.
 * @param {PIXI.Application} app - The PixiJS application instance.
 * @param {string} variant - One of 'bay', 'chestnut', 'palomino', 'black'
 * @returns {PIXI.Sprite}
 */
export function drawHorseSprite(colorHex, app, variant = 'bay') {
  const key = `${colorHex}_${variant}`;
  if (spriteCache.has(key)) {
    return new Sprite(spriteCache.get(key));
  }

  const gfx = new Graphics();
  const { body: bodyColor, mane: maneColor } = VARIANT_COLORS[variant] || VARIANT_COLORS.bay;
  const eyeColor = 0xffffff;

  // --- Tail (same as mane)
  gfx.beginFill(maneColor);
  gfx.drawRoundedRect(4, 16, 4, 9, 2);
  gfx.endFill();

  // --- Body
  gfx.beginFill(bodyColor);
  gfx.drawRoundedRect(10, 11, 26, 13, 4);
  gfx.endFill();

  // --- Saddle
  gfx.beginFill(colorHex);
  gfx.drawRoundedRect(18, 13, 9, 6, 2);
  gfx.endFill();

  // --- Legs
  gfx.beginFill(bodyColor);
  gfx.drawRect(13, 23, 3, 7);
  gfx.drawRect(17, 23, 3, 7);
  gfx.drawRect(27, 23, 3, 7);
  gfx.drawRect(31, 23, 3, 7);
  gfx.endFill();

  // --- Neck
  gfx.beginFill(bodyColor);
  gfx.drawRect(34, 12, 3, 9);
  gfx.endFill();

  // --- Head (tapered)
  gfx.beginFill(bodyColor);
  gfx.moveTo(37, 12);
  gfx.lineTo(44, 10);
  gfx.lineTo(44, 18);
  gfx.lineTo(37, 16);
  gfx.lineTo(37, 12);
  gfx.endFill();

  // --- Mane
  gfx.beginFill(maneColor);
  gfx.drawRect(37, 9, 2, 2);
  gfx.endFill();

  // --- Eye
  gfx.beginFill(eyeColor);
  gfx.drawRect(42, 12, 1, 1);
  gfx.endFill();

  const texture = app.renderer.generateTexture(gfx);
  spriteCache.set(key, texture);
  return new Sprite(texture);
}

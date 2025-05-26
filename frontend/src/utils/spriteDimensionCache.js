// File: frontend/src/utils/spriteDimensionCache.js
// Version: v1.2.0 — Replaces triangle logic with drawHorseSprite, restores getSpriteDimensions()

import { drawHorseSprite } from './drawHorseSprite';

export const spriteDimensionCache = new Map();

/**
 * Measures the width and height of a rendered horse sprite using drawHorseSprite,
 * including variant and saddle color.
 *
 * @param {number} colorHex - Hex color for the saddle.
 * @param {string|number} horseId - Horse ID used for caching.
 * @param {PIXI.Application} appInstance - The current PixiJS application.
 * @param {string} variant - Horse coat variant (e.g. 'bay', 'palomino').
 * @returns {{width: number, height: number}}
 */
export function getSpriteDimensions(colorHex, horseId, appInstance, variant = 'bay') {
  const key = `${colorHex}-${variant}`;
  if (spriteDimensionCache.has(key)) return spriteDimensionCache.get(key);

  const sprite = drawHorseSprite(colorHex, appInstance, variant);
  appInstance?.stage?.addChild?.(sprite);

  const size = {
    width: sprite.width,
    height: sprite.height
  };

  spriteDimensionCache.set(key, size);
  sprite.destroy?.();
  return size;
}

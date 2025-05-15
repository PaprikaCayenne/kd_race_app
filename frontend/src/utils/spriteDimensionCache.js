// File: frontend/src/utils/spriteDimensionCache.js
// Version: v1.0.0 — Caches sprite dimensions per unique horse ID

import { createHorseSprite } from './createHorseSprite';

const cache = new Map();

/**
 * Loads and measures sprite dimensions for a horse color/id combo.
 * Uses cache to avoid remeasuring.
 * @param {string} color 
 * @param {string} horseId 
 * @param {PIXI.Application} app 
 * @returns {{ width: number, height: number }}
 */
export function getSpriteDimensions(color, horseId, app) {
  if (cache.has(horseId)) {
    return cache.get(horseId);
  }

  const sprite = createHorseSprite(color, horseId, app);
  const dimensions = { width: sprite.width, height: sprite.height };
  cache.set(horseId, dimensions);
  sprite.destroy(); // Don’t leave temporary sprite in memory

  return dimensions;
}

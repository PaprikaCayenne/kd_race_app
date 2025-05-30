// File: frontend/src/utils/spriteDimensionCache.js
// Version: v1.4.0 — Uses off-stage container to measure sprites safely
// Date: 2025-05-28

import { Container } from 'pixi.js';
import { drawHorseSprite } from './drawHorseSprite';

export const spriteDimensionCache = new Map();

/**
 * Measures the width and height of a rendered horse sprite using drawHorseSprite,
 * sandboxed inside a temporary container — prevents corruption of main PixiJS stage.
 *
 * @param {string} [saddleHex='#888888'] - Saddle color hex.
 * @param {string} [bodyHex='#a0522d'] - Body color hex.
 * @param {string|number} horseId - Horse ID used for caching.
 * @param {PIXI.Application} appInstance - The current PixiJS app.
 * @returns {{width: number, height: number}}
 */
export function getSpriteDimensions(saddleHex = '#888888', bodyHex = '#a0522d', horseId, appInstance) {
  const key = `${saddleHex}-${bodyHex}-${horseId}`;
  if (spriteDimensionCache.has(key)) return spriteDimensionCache.get(key);

  const sandbox = new Container();
  const sprite = drawHorseSprite(saddleHex, bodyHex, appInstance);
  sandbox.addChild(sprite);

  const size = {
    width: sprite.width,
    height: sprite.height
  };

  spriteDimensionCache.set(key, size);
  sprite.destroy?.({ children: true });
  sandbox.destroy?.({ children: true });

  return size;
}

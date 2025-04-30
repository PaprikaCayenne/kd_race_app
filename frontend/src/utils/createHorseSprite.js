// File: frontend/src/utils/createHorseSprite.js
// Version: v0.2.4 — Fix padded hex logging, remove misleading short values

import { Graphics, Sprite } from 'pixi.js';
import { parseColorStringToHex } from './parseColorStringToHex.js';

export function createHorseSprite(colorInput, horseId = null, appInstance = null) {
  const hexColor = parseColorStringToHex(colorInput, horseId);
  const isValid = typeof hexColor === 'number' && hexColor >= 0x000000 && hexColor <= 0xFFFFFF;

  const finalColor = isValid ? hexColor : 0xff00ff; // Fallback to magenta
  const paddedHex = finalColor.toString(16).padStart(6, '0');

  if (!isValid) {
    console.warn(`[KD] ⚠️ Invalid color value for horse ${horseId ?? 'unknown'}:`, colorInput);
  } else {
    console.log(`[KD] 🧪 Sprite color for horse ${horseId}: #${paddedHex}`);
  }

  const size = 20;
  const g = new Graphics();
  g.beginFill(finalColor);
  g.drawPolygon([
    -size / 2, size / 2,
     size / 2, size / 2,
     0, -size / 2
  ]);
  g.endFill();

  if (!appInstance || !appInstance.renderer || typeof appInstance.renderer.generateTexture !== 'function') {
    console.error(`[KD] ❌ App instance or renderer not available — cannot generate texture for horse ${horseId}`);
    return new Sprite(); // Fallback empty sprite
  }

  const texture = appInstance.renderer.generateTexture(g);
  return new Sprite(texture);
}

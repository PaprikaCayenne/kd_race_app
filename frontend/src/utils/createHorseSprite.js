// File: frontend/src/utils/createHorseSprite.js
// Version: v0.2.5 — Align triangle tip to right; rotate accurately on path

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
    //console.log(`[KD] 🧪 Sprite color for horse ${horseId}: #${paddedHex}`);
  }

  const size = 20;
  const g = new Graphics();
  g.beginFill(finalColor);
  g.drawPolygon([
    size / 2, 0,             // tip — faces right (0 radians)
    -size / 2, size / 2,     // back-bottom
    -size / 2, -size / 2     // back-top
  ]);
  g.endFill();

  if (!appInstance || !appInstance.renderer || typeof appInstance.renderer.generateTexture !== 'function') {
    console.error(`[KD] ❌ App instance or renderer not available — cannot generate texture for horse ${horseId}`);
    return new Sprite(); // Fallback empty sprite
  }

  const texture = appInstance.renderer.generateTexture(g);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5); // center anchor for rotation
  return sprite;
}

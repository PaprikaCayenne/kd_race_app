// File: frontend/src/components/track/setupHorses.js
// Version: v1.4.2 — Passes app to getSpriteForColor to prevent ReferenceError

import { Sprite, Text, TextStyle, Graphics } from 'pixi.js';
import { getSpriteForColor } from '@/utils/getSpriteForColor';

export function setupHorses({
  app,
  horses,
  horsePaths,
  horseSpritesRef,
  labelSpritesRef,
  finishedHorsesRef,
  debugPathLinesRef,
  debugDotsRef,
  finishDotsRef,
  startDotsRef,
  horsePathsRef,
  lanes,
  debugVisible = false
}) {
  console.log('[KD] 🧩 setupHorses CALLED');

  horseSpritesRef.current.clear?.();
  labelSpritesRef.current.clear?.();
  finishedHorsesRef.current.clear?.();

  horseSpritesRef.current = new Map();
  labelSpritesRef.current = new Map();
  finishedHorsesRef.current = new Set();
  debugPathLinesRef.current = [];
  debugDotsRef.current = [];
  finishDotsRef.current = [];
  startDotsRef.current = [];
  horsePathsRef.current = horsePaths;

  horses.forEach((horse, index) => {
    const pathData = horsePaths.get(horse.id);
    if (!pathData || !Array.isArray(pathData.path) || pathData.path.length < 2) {
      console.warn(`[KD] ⚠️ Invalid path for horse ${horse.name}`);
      return;
    }

    const { getPointAtDistance } = pathData;
    const { x, y, rotation } = getPointAtDistance(0);

    const colorHex = parseColorToHex(horse.color);
    const sprite = getSpriteForColor(colorHex, app); // ✅ Pass `app` here

    sprite.x = x;
    sprite.y = y;
    sprite.rotation = rotation;
    sprite.anchor.set(0.5);
    sprite.zIndex = 10;
    app.stage.addChild(sprite);

    horseSpritesRef.current.set(horse.id, sprite);
    console.log(`[KD] 🐎 Placing horse ${horse.name} | dbId=${horse.id} | localId=${horse.localId} → (${x.toFixed(1)}, ${y.toFixed(1)})`);

    const label = new Text(horse.name, new TextStyle({
      fill: '#000',
      fontSize: 12,
      fontWeight: 'bold',
      stroke: '#fff',
      strokeThickness: 2
    }));
    label.anchor.set(0.5);
    label.x = x;
    label.y = y - 20;
    label.zIndex = 11;
    app.stage.addChild(label);
    labelSpritesRef.current.set(horse.id, label);

    if (debugVisible) {
      const debugDot = new Graphics();
      debugDot.beginFill(colorHex).drawCircle(0, 0, 4).endFill();
      debugDot.position.set(x, y);
      debugDot.zIndex = 5;
      app.stage.addChild(debugDot);
      debugDotsRef.current.push(debugDot);
    }
  });
}

function parseColorToHex(color) {
  if (typeof color !== 'string') return 0x888888;
  if (color.startsWith('#')) return parseInt(color.slice(1), 16);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r << 16) + (g << 8) + b;
}

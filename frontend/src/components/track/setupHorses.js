// File: frontend/src/components/track/setupHorses.js
// Version: v1.7.1 — Passes `horse.variant` to enable coat coloring

import { Sprite, Text, TextStyle, Graphics } from 'pixi.js';
import { drawHorseSprite } from '@/utils/drawHorseSprite';
import parseColorToHex from '@/utils/parseColorToHex';

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

  horseSpritesRef.current?.clear?.();
  labelSpritesRef.current?.clear?.();
  finishedHorsesRef.current?.clear?.();

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

    const { getPointAtDistance, path } = pathData;
    const { x, y } = getPointAtDistance(0);

    const colorHex = parseColorToHex(horse.color);
    const sprite = drawHorseSprite(colorHex, app, horse.variant || 'bay');

    sprite.anchor.set(0.5);
    sprite.rotation = 0;
    sprite.x = x - sprite.width / 2;
    sprite.y = y;
    sprite.zIndex = 10;
    app.stage.addChild(sprite);
    horseSpritesRef.current.set(horse.id, sprite);

    console.log(`[KD] 🐎 Placing horse ${horse.name} | dbId=${horse.id} | localId=${horse.localId} → (${sprite.x.toFixed(1)}, ${sprite.y.toFixed(1)})`);

    const label = new Text(horse.name, new TextStyle({
      fill: '#000',
      fontSize: 12,
      fontWeight: 'bold',
      stroke: '#fff',
      strokeThickness: 2
    }));
    label.anchor.set(0.5);
    label.x = sprite.x;
    label.y = sprite.y - 20;
    label.zIndex = 11;
    labelSpritesRef.current.set(horse.id, label);
    if (debugVisible) app.stage.addChild(label);

    if (debugVisible) {
      const debugDot = new Graphics();
      debugDot.beginFill(colorHex).drawCircle(0, 0, 4).endFill();
      debugDot.position.set(sprite.x, sprite.y);
      debugDot.zIndex = 5;
      app.stage.addChild(debugDot);
      debugDotsRef.current.push(debugDot);
    }

    const line = new Graphics();
    line.lineStyle(1, colorHex, 0.6);
    path.forEach((pt, i) => {
      if (i === 0) line.moveTo(pt.x, pt.y);
      else line.lineTo(pt.x, pt.y);
    });
    line.zIndex = 1;
    debugPathLinesRef.current.push(line);
    if (debugVisible) app.stage.addChild(line);
  });
}

// File: frontend/src/components/track/setupHorses.js
// Version: v1.4.0 — Aligns horse placement to arcDistance=0 (true 12 o’clock start)

import { Sprite, Text, TextStyle } from 'pixi.js';

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
    const sprite = getSpriteForColor(colorHex);

    sprite.x = x;
    sprite.y = y;
    sprite.rotation = rotation;
    sprite.anchor.set(0.5);
    sprite.zIndex = 10;
    app.stage.addChild(sprite);

    horseSpritesRef.current.set(horse.id, sprite);
    console.log(`[KD] 🐎 Placing horse ${horse.name} | dbId=${horse.id} | localId=${horse.localId} → (${x.toFixed(1)}, ${y.toFixed(1)})`);

    // 📛 Add label
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

    // 🔵 Optional debug dot
    if (debugVisible) {
      const debugDot = new PIXI.Graphics();
      debugDot.beginFill(colorHex).drawCircle(0, 0, 4).endFill();
      debugDot.position.set(x, y);
      debugDot.zIndex = 5;
      app.stage.addChild(debugDot);
      debugDotsRef.current.push(debugDot);
    }
  });
}

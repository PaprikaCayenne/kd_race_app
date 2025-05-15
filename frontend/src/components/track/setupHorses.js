// File: frontend/src/components/track/setupHorses.js
// Version: v1.6.0 — Uses vector path start instead of raw path[0]; fully aligned to arc-length logic

import { Graphics, Text } from 'pixi.js';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';

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
  debugVisible
}) {
  horseSpritesRef.current = new Map();
  labelSpritesRef.current = new Map();
  horsePathsRef.current = new Map();
  finishedHorsesRef.current = new Set();
  debugPathLinesRef.current = [];
  startDotsRef.current = [];

  console.log('[KD] 🧩 horseSpritesRef identity at setup:', horseSpritesRef.current);
  console.log('[KD] 🧪 Debug horseSpritesRef keys:', Array.from(horseSpritesRef.current?.keys?.() ?? []));
  console.log('[KD] 🧪 Debug horsePathsRef keys:', Array.from(horsePathsRef.current?.keys?.() ?? []));
  console.log('[KD] 🧪 Debug horses (dbId, localId):', horses.map(h => `(${h.id}, ${h.localId})`));

  horses.forEach((horse) => {
    const { id, color, localId } = horse;
    const horseData = horsePaths[id];

    if (!horseData || typeof horseData.getPointAtDistance !== 'function') {
      console.warn(`[KD] ⚠️ Skipping horse dbId=${id} | localId=${localId} — invalid vector path`, horseData);
      return;
    }

    const { laneIndex, path, getPointAtDistance, pathLength } = horseData;
    const start = getPointAtDistance(0);

    const sprite = createHorseSprite(color, id, app);
    sprite.anchor?.set?.(0.5);
    sprite.zIndex = 5;
    sprite.__progress = 0;
    sprite.__distance = 0;
    sprite.__horseId = id;
    sprite.__localIndex = localId;

    sprite.position.set(start.x, start.y);
    sprite.rotation = start.rotation;

    console.log(`[KD] 🐎 Placing horse ${horse.name} | dbId=${id} | localId=${localId} at (${start.x.toFixed(1)}, ${start.y.toFixed(1)}) in lane ${laneIndex}`);
    console.log(`[KD] ↪️ Facing angle: ${sprite.rotation.toFixed(2)} rad`);

    app.stage.addChild(sprite);
    horseSpritesRef.current.set(id, sprite);
    horsePathsRef.current.set(id, horseData);

    const label = new Text(`${localId + 1}`, {
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2
    });
    label.anchor.set(0.5);
    label.position.set(start.x, start.y - 20);
    label.zIndex = 6;
    labelSpritesRef.current.set(id, label);
    if (debugVisible) app.stage.addChild(label);

    const dot = new Graphics();
    dot.beginFill(0x00ff00).drawCircle(0, 0, 4).endFill();
    dot.zIndex = 99;
    dot.position.set(start.x, start.y);
    startDotsRef.current.push(dot);
    if (debugVisible) app.stage.addChild(dot);

    const pathLine = new Graphics();
    pathLine.lineStyle(1, parseColorStringToHex(color, id));
    pathLine.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      pathLine.quadraticCurveTo(p1.x, p1.y, cx, cy);
    }
    pathLine.lineTo(path.at(-1).x, path.at(-1).y);
    pathLine.zIndex = 1;
    debugPathLinesRef.current.push(pathLine);
    if (debugVisible) app.stage.addChild(pathLine);
  });
}

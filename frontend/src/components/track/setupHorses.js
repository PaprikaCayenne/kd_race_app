// File: frontend/src/components/track/setupHorses.js
// Version: v1.9.1 — Uses arcPoints and startDistance without rotation

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
  horsePathsRef.current = horsePaths;
  finishedHorsesRef.current = new Set();
  debugPathLinesRef.current = [];
  startDotsRef.current = [];

  console.log('[KD] 🧩 setupHorses CALLED');

  horses.forEach((horse) => {
    const { id, color, localId } = horse;
    const horseData = horsePaths.get(id);

    if (!horseData || typeof horseData.getPointAtDistance !== 'function') {
      console.warn(`[KD] ⚠️ Skipping horse dbId=${id} — invalid vector path`, horseData);
      return;
    }

    console.log('[KD] 🧪 horseData keys for horse', id, Object.keys(horseData));
    console.log('[KD] ✅ Placing horse using startDistance =', horseData.startDistance.toFixed(2));

    const { laneIndex, arcPoints, getPointAtDistance, startDistance } = horseData;

    const sprite = createHorseSprite(color, id, app);
    sprite.anchor?.set?.(0.5);
    sprite.zIndex = 5;
    sprite.__progress = 0;
    sprite.__distance = 0;
    sprite.__horseId = id;
    sprite.__localIndex = localId;

    const start = getPointAtDistance(startDistance);

    const dx = Math.cos(start.rotation) * sprite.width / 2;
    const dy = Math.sin(start.rotation) * sprite.width / 2;
    sprite.position.set(start.x - dx, start.y - dy);
    sprite.rotation = start.rotation;

    console.log(
      `[KD] 🐎 Placing horse ${horse.name} | dbId=${id} | localId=${localId} at (${(start.x - dx).toFixed(
        1
      )}, ${(start.y - dy).toFixed(1)}) using startDistance=${startDistance.toFixed(2)}`
    );

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

    const normalX = -Math.sin(start.rotation);
    const normalY = Math.cos(start.rotation);
    const labelOffset = 20;
    label.position.set(
      sprite.position.x + normalX * labelOffset,
      sprite.position.y + normalY * labelOffset
    );
    label.zIndex = 6;
    labelSpritesRef.current.set(id, label);
    if (debugVisible) app.stage.addChild(label);

    const dot = new Graphics();
    dot.beginFill(0x00ff00).drawCircle(0, 0, 4).endFill();
    dot.zIndex = 99;
    dot.position.set(sprite.position.x, sprite.position.y);
    startDotsRef.current.push(dot);
    if (debugVisible) app.stage.addChild(dot);

    const pathLine = new Graphics();
    pathLine.lineStyle(1, parseColorStringToHex(color, id));
    pathLine.moveTo(arcPoints[0].x, arcPoints[0].y);
    for (let i = 1; i < arcPoints.length - 1; i++) {
      const p1 = arcPoints[i];
      const p2 = arcPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      pathLine.quadraticCurveTo(p1.x, p1.y, cx, cy);
    }
    pathLine.lineTo(arcPoints.at(-1).x, arcPoints.at(-1).y);
    pathLine.zIndex = 1;
    debugPathLinesRef.current.push(pathLine);
    if (debugVisible) app.stage.addChild(pathLine);
  });
}

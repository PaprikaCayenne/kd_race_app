// File: frontend/src/components/track/setupHorses.js
// Version: v1.1.1 — Adds debug logs for sprite placement failures and shows missing lane/path info

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
  horses.forEach((horse, index) => {
    const { id, color } = horse;
    const horseData = horsePaths[id];

    if (!horseData || !horseData.path || horseData.path.length < 2) {
      console.warn(`[KD] ⚠️ Skipping horse ID ${id} — invalid path`, horseData);
      return;
    }

    const path = horseData.path;
    const laneIndex = horseData.laneIndex;

    const sprite = createHorseSprite(color, id, app);
    sprite.anchor?.set?.(0.5);
    sprite.zIndex = 5;
    sprite.__progress = 0;
    sprite.__horseId = id;
    sprite.__localIndex = index;

    const dx = path[1].x - path[0].x;
    const dy = path[1].y - path[0].y;
    const len = Math.sqrt(dx ** 2 + dy ** 2);
    if (len === 0 || isNaN(len)) {
      console.warn(`[KD] ⚠️ Invalid direction vector for horse ${id}`, { p0: path[0], p1: path[1] });
      return;
    }

    const dirX = dx / len;
    const dirY = dy / len;

    const adjustedX = path[0].x - dirX * (sprite.width / 2);
    const adjustedY = path[0].y - dirY * (sprite.height / 2);

    console.log(`[KD] 🐎 Placing horse ${id} at (${adjustedX.toFixed(1)}, ${adjustedY.toFixed(1)}) in lane ${laneIndex}`);

    sprite.position.set(adjustedX, adjustedY);
    sprite.rotation = Math.atan2(dy, dx);

    app.stage.addChild(sprite);
    horseSpritesRef.current.set(index, sprite);
    horsePathsRef.current[index] = horse;

    const label = new Text(`${index + 1}`, {
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2
    });
    label.anchor.set(0.5);
    label.position.set(adjustedX, adjustedY);
    label.zIndex = 6;
    labelSpritesRef.current.set(index, label);
    if (debugVisible) app.stage.addChild(label);

    const dot = new Graphics();
    dot.beginFill(0x00ff00).drawCircle(0, 0, 4).endFill();
    dot.zIndex = 99;
    dot.position.set(adjustedX, adjustedY);
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

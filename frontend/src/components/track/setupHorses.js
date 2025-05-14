// File: frontend/src/components/track/setupHorses.js
// Version: v1.2.3 — Restores original placement at path[0] without slicing or shifting progress

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
  debugVisible,
}) {
  horses.forEach((horse, index) => {
    const { path } = horsePaths[horse.id];
    const totalPoints = path.length;

    const sprite = createHorseSprite(horse.color, horse.id, app);
    sprite.anchor?.set?.(0.5);
    sprite.zIndex = 5;
    sprite.__progress = 0.0;
    sprite.__horseId = horse.id;
    sprite.__localIndex = index;

    const startPoint = path[0];
    const nextPoint = path[1];
    const dx = nextPoint.x - startPoint.x;
    const dy = nextPoint.y - startPoint.y;
    const len = Math.sqrt(dx ** 2 + dy ** 2) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const padding = Math.max(sprite.width, sprite.height) / 2;
    const adjustedX = startPoint.x - dirX * padding;
    const adjustedY = startPoint.y - dirY * padding;
    sprite.position.set(adjustedX, adjustedY);
    sprite.rotation = Math.atan2(dy, dx);

    app.stage.addChild(sprite);
    horseSpritesRef.current.set(horse.id, sprite);

    if (horsePathsRef?.current) {
      horsePathsRef.current[horse.id] = { path, debug: { finishIndex: totalPoints - 1 } };
    }

    const label = new Text(`${index + 1}`, {
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2
    });
    label.anchor.set(0.5);
    label.position.set(adjustedX, adjustedY);
    label.zIndex = 6;
    labelSpritesRef.current.set(horse.id, label);
    if (debugVisible) app.stage.addChild(label);

    const dot = new Graphics();
    dot.beginFill(0x00ff00).drawCircle(0, 0, 4).endFill();
    dot.zIndex = 99;
    dot.position.set(adjustedX, adjustedY);
    startDotsRef.current.push(dot);
    if (debugVisible) app.stage.addChild(dot);

    const pathLine = new Graphics();
    pathLine.lineStyle(1, parseColorStringToHex(horse.color, horse.id));
    pathLine.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      pathLine.lineTo(path[i].x, path[i].y);
    }
    pathLine.zIndex = 1;
    debugPathLinesRef.current.push(pathLine);
    if (debugVisible) app.stage.addChild(pathLine);

    console.log(`[KD] 🐎 Restored horse ${horse.id} at path[0] (index 0)`);
  });
}
`

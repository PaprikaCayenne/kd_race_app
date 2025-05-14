// File: frontend/src/components/track/setupHorses.js
// Version: v1.0.1 — Adds __horseId and __localIndex to sprite; keys all refs by local index

import { Graphics, Text } from 'pixi.js';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';

export function setupHorses({
  app,
  horses,
  debugVisible,
  horseSpritesRef,
  labelSpritesRef,
  debugDotsRef,
  debugPathLinesRef,
  finishDotsRef,
  startDotsRef,
  horsePathsRef
}) {
  horses.forEach((horse, index) => {
    const { id, path, startPoint, placement, color } = horse;

    const sprite = createHorseSprite(color, id, app);
    sprite.anchor?.set?.(0.5);
    sprite.zIndex = 5;
    sprite.__progress = 0;
    sprite.__horseId = id;        // DB ID
    sprite.__localIndex = index;  // 0-based index used in race

    const dx = path[1].x - path[0].x;
    const dy = path[1].y - path[0].y;
    const len = Math.sqrt(dx ** 2 + dy ** 2);
    const dirX = dx / len;
    const dirY = dy / len;

    const adjustedX = startPoint.x + dirX * (sprite.width / 2);
    const adjustedY = startPoint.y + dirY * (sprite.height / 2);
    sprite.position.set(adjustedX, adjustedY);
    sprite.rotation = Math.atan2(dy, dx);

    app.stage.addChild(sprite);
    horseSpritesRef.current.set(index, sprite);          // Keyed by index
    horsePathsRef.current[index] = horse;

    const label = new Text(`${placement}`, {
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2
    });
    label.anchor.set(0.5);
    label.position.set(adjustedX, adjustedY);
    label.zIndex = 6;
    labelSpritesRef.current.set(index, label);           // Keyed by index
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

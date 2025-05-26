// File: frontend/src/components/track/updateDebugDots.js
// Version: v1.0.0 — Draws debug dots live per toggle state
// Date: 2025-05-24

import { Graphics } from 'pixi.js';

export function updateDebugDots({
  horses,
  horsePaths,
  app,
  debugDotsRef,
  debugVisible
}) {
  // Clear previous dots
  debugDotsRef.current.forEach(dot => {
    if (app?.stage && dot?.destroy) app.stage.removeChild(dot);
  });
  debugDotsRef.current = [];

  if (!debugVisible || !app?.stage) return;

  horses.forEach((horse) => {
    const path = horsePaths.get(horse.id);
    if (!path?.trueFinish || !path?.driftEnd || !path?.getPointAtDistance) return;

    const { trueFinish, driftEnd } = path;

    const driftStart = path.getPointAtDistance(trueFinish.arcLength + 1);

    const blue = new Graphics();
    blue.beginFill(0x0000ff).drawCircle(trueFinish.x, trueFinish.y, 5).endFill();
    app.stage.addChild(blue);
    debugDotsRef.current.push(blue);

    const red = new Graphics();
    red.lineStyle(2, 0xff0000).drawCircle(driftEnd.x, driftEnd.y, 7);
    app.stage.addChild(red);
    debugDotsRef.current.push(red);

    const orange = new Graphics();
    orange.beginFill(0xffaa00, 0.4).drawCircle(trueFinish.x, trueFinish.y, 8).endFill();
    orange.lineStyle(3, 0xff8800)
      .moveTo(trueFinish.x - 10, trueFinish.y - 10)
      .lineTo(trueFinish.x + 10, trueFinish.y + 10)
      .moveTo(trueFinish.x + 10, trueFinish.y - 10)
      .lineTo(trueFinish.x - 10, trueFinish.y + 10);
    app.stage.addChild(orange);
    debugDotsRef.current.push(orange);

    const purple = new Graphics();
    purple.beginFill(0x800080).drawCircle(driftStart.x, driftStart.y, 5).endFill();
    app.stage.addChild(purple);
    debugDotsRef.current.push(purple);

    console.log(`[KD] 🎯 ${horse.name} true finish = ${trueFinish.arcLength.toFixed(2)} px @ (${trueFinish.x.toFixed(1)}, ${trueFinish.y.toFixed(1)})`);
    console.log(`[KD] 🔴 ${horse.name} drift end = ${driftEnd.arcLength.toFixed(2)} px @ (${driftEnd.x.toFixed(1)}, ${driftEnd.y.toFixed(1)})`);
    console.log(`[KD] 🟣 ${horse.name} drift start = (${driftStart.x.toFixed(1)}, ${driftStart.y.toFixed(1)})`);
  });
}

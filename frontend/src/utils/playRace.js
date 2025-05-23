// File: frontend/src/utils/playRace.js
// Version: v2.10.1 — Adds finish times in seconds to race result logs
// Date: 2025-05-23
// Purpose: Shows accurate race timing in seconds per horse with ordinal labels

import { Graphics } from 'pixi.js';

const DEBUG = true;
const TICK_INTERVAL = 1000 / 30;
const RACE_DURATION_SECONDS = 10;
const FINISH_PROXIMITY_PX = 4;

export function playRace({
  app,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = 1
}) {
  const finished = new Set();
  const results = [];
  const distanceMap = new Map();
  const driftJumpMap = new Map();
  const speedMap = new Map();

  const ticksPerRace = RACE_DURATION_SECONDS * (1000 / TICK_INTERVAL);
  const raceStartTime = performance.now();

  horses.forEach((horse) => {
    const { id, name } = horse;
    const path = horsePaths.get(id);
    const driftEnd = path?.driftEnd;
    const trueFinish = path?.trueFinish;

    if (!trueFinish || !path?.getPointAtDistance) {
      console.error(`[KD] ❌ Missing trueFinish or getPointAtDistance for ${name}`);
      return;
    }

    distanceMap.set(id, 0);
    driftJumpMap.set(id, false);

    const normalizedSpeed = (trueFinish.arcLength / ticksPerRace) * speedMultiplier;
    speedMap.set(id, normalizedSpeed);

    if (DEBUG && app?.stage) {
      const blue = new Graphics();
      blue.beginFill(0x0000ff).drawCircle(trueFinish.x, trueFinish.y, 5).endFill();
      app.stage.addChild(blue);

      const red = new Graphics();
      red.lineStyle(2, 0xff0000).drawCircle(driftEnd.x, driftEnd.y, 7);
      app.stage.addChild(red);

      const orange = new Graphics();
      orange.beginFill(0xffaa00, 0.4).drawCircle(trueFinish.x, trueFinish.y, 8).endFill();
      orange.lineStyle(3, 0xff8800)
        .moveTo(trueFinish.x - 10, trueFinish.y - 10)
        .lineTo(trueFinish.x + 10, trueFinish.y + 10)
        .moveTo(trueFinish.x + 10, trueFinish.y - 10)
        .lineTo(trueFinish.x - 10, trueFinish.y + 10);
      app.stage.addChild(orange);

      const driftStart = path.getPointAtDistance(trueFinish.arcLength + 1);
      const purple = new Graphics();
      purple.beginFill(0x800080).drawCircle(driftStart.x, driftStart.y, 5).endFill();
      app.stage.addChild(purple);

      console.log(`[KD] 🎯 ${name} true finish = ${trueFinish.arcLength.toFixed(2)} px @ (${trueFinish.x.toFixed(1)}, ${trueFinish.y.toFixed(1)})`);
      console.log(`[KD] 🟣 ${name} driftStart = (${driftStart.x.toFixed(1)}, ${driftStart.y.toFixed(1)})`);
    }
  });

  const ticker = setInterval(() => {
    horses.forEach((horse) => {
      const { id, name } = horse;
      const path = horsePaths.get(id);
      const sprite = horseSprites.get(id);
      const label = labelSprites.get(id);
      const trueFinish = path?.trueFinish;

      if (!sprite || !label || !path?.getPointAtDistance || !trueFinish) return;

      let distance = distanceMap.get(id);
      const isFinished = finished.has(id);
      const hasJumped = driftJumpMap.get(id);
      const maxDistance = path.driftEnd.arcLength;
      const speed = speedMap.get(id);

      if (isFinished && !hasJumped) {
        distance = trueFinish.arcLength + 1;
        driftJumpMap.set(id, true);
      } else {
        distance = Math.min(distance + speed, maxDistance);
      }

      distanceMap.set(id, distance);

      const point = path.getPointAtDistance(distance);
      let next = path.getPointAtDistance(Math.min(distance + 1, maxDistance));
      if (!point || !next) return;

      sprite.x = point.x;
      sprite.y = point.y;
      sprite.rotation = Math.atan2(next.y - point.y, next.x - point.x);
      label.x = point.x;
      label.y = point.y - 20;

      const dx = point.x - trueFinish.x;
      const dy = point.y - trueFinish.y;
      const pixelDelta = Math.sqrt(dx * dx + dy * dy);
      const justCrossed = !isFinished && pixelDelta <= FINISH_PROXIMITY_PX;

      if (justCrossed) {
        finished.add(id);
        sprite.tint = 0x888888;
        label.style.fill = 0x888888;

        const now = performance.now();
        const elapsed = now - raceStartTime;
        const finishTimeSec = (elapsed / 1000).toFixed(2);

        results.push({ id, name, finalSpeed: speed, finishTimeSec });

        const redDelta = (path.driftEnd.arcLength - trueFinish.arcLength).toFixed(2);

        if (DEBUG) {
          console.log(`[KD] 🏁 ${name} finished ${results.length} at distance ${distance.toFixed(2)} (expected: ${trueFinish.arcLength.toFixed(2)})`);
          console.log(`[KD] 🟧 ${name} actual finish point = (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
          console.log(`[KD] 📏 ${name} pixel Δ to blue = ${pixelDelta.toFixed(2)} px`);
          console.log(`[KD] 🧪 Δ to red = ${redDelta} px`);
        }

        if (results.length === horses.length) {
          if (DEBUG) {
            console.log('[KD] ✅ All horses finished — onRaceEnd() triggered');
            results.forEach((r, i) =>
              console.log(`🏁 ${i + 1}${getOrdinal(i + 1)}: ${r.name} — ${r.finishTimeSec} seconds`)
            );
          }
          onRaceEnd(results);
        }
      }
    });
  }, TICK_INTERVAL);
}

function getOrdinal(n) {
  return ['st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10 - 1] || 'th';
}

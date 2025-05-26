// File: frontend/src/utils/playRace.js
// Version: v3.4.0 — Finalizes arc-based finish trigger with delta logging and drift safety
// Date: 2025-05-25

import { Graphics } from 'pixi.js';

const FINISH_PROXIMITY_PX = 4;
const TICK_INTERVAL = 1000 / 30;
const RACE_DURATION_SECONDS = 10;

export function playRace({
  app,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = 1,
  debugVisible = false
}) {
  const finished = new Set();
  const results = [];
  const distanceMap = new Map();
  const speedMap = new Map();

  const ticksPerRace = RACE_DURATION_SECONDS * (1000 / TICK_INTERVAL);
  const raceStartTime = performance.now();

  horses.forEach((horse) => {
    const { id, name } = horse;
    const path = horsePaths.get(id);
    const trueFinish = path?.trueFinish;

    if (!trueFinish || !path?.getPointAtDistance) {
      console.error(`[KD] ❌ Missing trueFinish or getPointAtDistance for ${name}`);
      return;
    }

    distanceMap.set(id, 0);
    const normalizedSpeed = (trueFinish.arcLength / ticksPerRace) * speedMultiplier;
    speedMap.set(id, normalizedSpeed);
  });

  const ticker = setInterval(() => {
    horses.forEach((horse) => {
      const { id, name } = horse;
      const path = horsePaths.get(id);
      const sprite = horseSprites.get(id);
      const label = labelSprites.get(id);
      const trueFinish = path?.trueFinish;
      const driftEnd = path?.driftEnd;

      if (!sprite || !label || !path?.getPointAtDistance || !trueFinish || !driftEnd) return;

      let distance = distanceMap.get(id);
      const speed = speedMap.get(id);
      const maxDistance = driftEnd.arcLength;

      // Advance distance forward without ever exceeding drift
      distance = Math.min(distance + speed, maxDistance);
      distanceMap.set(id, distance);

      const point = path.getPointAtDistance(distance);
      const next = path.getPointAtDistance(Math.min(distance + 1, maxDistance));
      if (!point || !next) return;

      sprite.x = point.x;
      sprite.y = point.y;
      sprite.rotation = Math.atan2(next.y - point.y, next.x - point.x);
      label.x = point.x;
      label.y = point.y - 20;

      const isFinished = finished.has(id);
      const dx = point.x - trueFinish.x;
      const dy = point.y - trueFinish.y;
      const pixelDelta = Math.sqrt(dx * dx + dy * dy);
      const arcDelta = Math.abs(distance - trueFinish.arcLength);
      const justCrossed = !isFinished && pixelDelta <= FINISH_PROXIMITY_PX;

      if (justCrossed) {
        finished.add(id);
        sprite.tint = 0x888888;
        label.style.fill = 0x888888;

        const now = performance.now();
        const elapsed = now - raceStartTime;
        const finishTimeSec = (elapsed / 1000).toFixed(2);

        results.push({ id, name, finalSpeed: speed, finishTimeSec });

        if (debugVisible) {
          const orangeX = new Graphics();
          orangeX.lineStyle(3, 0xff8800)
            .moveTo(point.x - 10, point.y - 10)
            .lineTo(point.x + 10, point.y + 10)
            .moveTo(point.x + 10, point.y - 10)
            .lineTo(point.x - 10, point.y + 10);
          app.stage.addChild(orangeX);

          console.log(`[KD] 🏁 ${name} finished ${results.length} at distance ${distance.toFixed(2)} (expected: ${trueFinish.arcLength.toFixed(2)})`);
          console.log(`[KD] 🟧 ${name} actual finish point = (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
          console.log(`[KD] 📏 ${name} pixel Δ to blue = ${pixelDelta.toFixed(2)} px`);
          console.log(`[KD] 📐 ${name} arc Δ = ${arcDelta.toFixed(2)} px`);
          console.log(`[KD] 🧪 Δ to red = ${(driftEnd.arcLength - trueFinish.arcLength).toFixed(2)} px`);
        }

        if (results.length === horses.length) {
          if (debugVisible) {
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

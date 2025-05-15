// File: frontend/src/utils/playRace.js
// Version: v2.3.0 — Adds deep diagnostic logs for movement skipping reasons

export function playRace({
  app,
  horseSprites,
  horsePaths,
  labelSprites,
  finishedHorses,
  horses,
  onRaceEnd,
  speedMultiplier = 1
}) {
  if (app.__raceTicker) {
    app.ticker.remove(app.__raceTicker);
    app.__raceTicker = null;
  }

  console.log('[KD] 🎬 Starting race with vector-distance tracking');
  console.log('[KD] 🧪 playRace received horses:', horses.map(h => `(${h.id}, ${h.localId})`));

  const resultOrder = [];
  const lapFinished = new Set();

  const replayLog = new Map();
  const speedProfiles = new Map();

  const BASE_SPEED = 0.45;
  const CURVE_EXAGGERATION = 2.0;
  const EPSILON = 2;
  const DEBUG = true;

  horses.forEach((horse) => {
    speedProfiles.set(horse.id, {
      fatigue: 1.0,
      burst: false
    });

    const sprite = horseSprites.get(horse.id);
    if (sprite) {
      sprite.__distance = 0;
      if (DEBUG) {
        console.log(`[KD] 🐎 Init ${horse.name} | id=${horse.id} | localId=${horse.localId} | Start dist=0`);
      }
    }
  });

  const ticker = (delta) => {
    console.log('[KD] ⏱️ ticker loop triggered');
    console.log('[KD] ⏱️ horses.length =', horses.length);

    let allFinished = true;

    horses.forEach((horse) => {
      const horseId = horse.id;
      const localId = horse.localId ?? '?';
      const sprite = horseSprites.get(horseId);
      const label = labelSprites.get(horseId);
      const pathData = horsePaths.get(horseId);

      const isSpriteMissing = !sprite;
      const isPathMissing = !pathData;
      const isAlreadyFinished = finishedHorses.has(horseId);

      if (isSpriteMissing || isPathMissing || isAlreadyFinished) {
        console.warn(`[KD] 🚫 Skipping horse id=${horseId} | localId=${localId}`);
        if (isSpriteMissing) console.warn(`[KD] ❌ Missing sprite for id=${horseId}`);
        if (isPathMissing) console.warn(`[KD] ❌ Missing pathData for id=${horseId}`);
        if (isAlreadyFinished) console.warn(`[KD] ⚠️ Already marked finished: id=${horseId}`);
        return;
      }

      console.log(`[KD] ✅ Executing movement for horse id=${horseId} | localId=${localId}`);

      const { rotatedPath, pathLength, getPointAtDistance, getCurveFactorAt } = pathData;
      if (!rotatedPath || !getPointAtDistance) {
        console.warn(`[KD] ❌ Incomplete pathData for id=${horseId}`);
        return;
      }

      const profile = speedProfiles.get(horseId);
      const fatigue = profile?.fatigue ?? 1.0;
      const burst = profile?.burst ?? false;

      const currentDistance = sprite.__distance ?? 0;

      const curveFactor = getCurveFactorAt ? getCurveFactorAt(currentDistance) : 1.0;
      const curveBoost = Math.pow(curveFactor, CURVE_EXAGGERATION);
      const finalSpeed = BASE_SPEED * fatigue * (burst ? 1.2 : 1) * curveBoost * speedMultiplier;
      const nextDistance = currentDistance + finalSpeed * delta;

      if (DEBUG) {
        console.log(`[KD] 🏃 Frame: ${horse.name} | id=${horseId} | dist=${currentDistance.toFixed(2)} → ${nextDistance.toFixed(2)} | speed=${finalSpeed.toFixed(3)}`);
      }

      if (nextDistance >= pathLength - EPSILON) {
        if (!finishedHorses.has(horseId)) {
          finishedHorses.add(horseId);
          lapFinished.add(horseId);
          resultOrder.push({
            id: horseId,
            name: horse.name,
            localId,
            timeMs: performance.now()
          });
          if (DEBUG) {
            console.log(`[KD] 🏁 Finished: ${horse.name} | id=${horseId} | localId=${localId} @ ${nextDistance.toFixed(2)} / ${pathLength}`);
          }
        }
        return;
      }

      allFinished = false;
      sprite.__distance = nextDistance;

      const { x, y, rotation } = getPointAtDistance(nextDistance);
      sprite.x = x;
      sprite.y = y;
      sprite.rotation = rotation;

      if (DEBUG) {
        console.log(`[KD] 🧭 Pos: ${horse.name} → (${x.toFixed(1)}, ${y.toFixed(1)}) | rot=${rotation.toFixed(2)}`);
      }

      if (label) {
        label.x = x;
        label.y = y - 20;
      }

      if (!replayLog.has(horseId)) replayLog.set(horseId, []);
      replayLog.get(horseId).push({
        time: performance.now(),
        distance: nextDistance,
        speed: finalSpeed,
        fatigue,
        burst,
        curveFactor,
        x,
        y,
        localId
      });
    });

    if (allFinished && horses.length && finishedHorses.size === horses.length) {
      if (DEBUG) console.log('[KD] ✅ All horses finished');
      app.ticker.remove(ticker);
      app.__raceTicker = null;
      onRaceEnd?.(resultOrder, replayLog);
    }
  };

  app.ticker.add(ticker);
  app.ticker.start();

  console.log('[KD] 🧪 Ticker added to app:', !!app.ticker);
  console.log('[KD] 🧪 app.ticker.running:', app.ticker?.started ?? 'unknown (force-started)');

  app.__raceTicker = ticker;
}

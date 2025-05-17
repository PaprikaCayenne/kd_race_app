// File: frontend/src/utils/playRace.js
// Version: v2.4.0 — Fully vector-aligned playback with correct arc-distance tracking

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

  const BASE_SPEED = 0.45;
  const CURVE_EXAGGERATION = 2.0;
  const EPSILON = 2;
  const DEBUG = true;

  const resultOrder = [];
  const lapFinished = new Set();
  const replayLog = new Map();
  const speedProfiles = new Map();

  horses.forEach((horse) => {
    speedProfiles.set(horse.id, { fatigue: 1.0, burst: false });
    const sprite = horseSprites.get(horse.id);
    if (sprite) {
      sprite.__distance = 0;
      if (DEBUG) {
        console.log(`[KD] 🐎 Init ${horse.name} | id=${horse.id} | Start at distance=0`);
      }
    }
  });

  const ticker = (delta) => {
    let allFinished = true;

    horses.forEach((horse) => {
      const id = horse.id;
      const sprite = horseSprites.get(id);
      const label = labelSprites.get(id);
      const pathData = horsePaths.get(id);

      if (!sprite || !pathData || finishedHorses.has(id)) return;

      const { getPointAtDistance, getCurveFactorAt, pathLength } = pathData;
      const profile = speedProfiles.get(id);

      const currentDist = sprite.__distance ?? 0;
      const fatigue = profile?.fatigue ?? 1.0;
      const burst = profile?.burst ?? false;

      const curveFactor = getCurveFactorAt?.(currentDist) ?? 1.0;
      const curveBoost = Math.pow(curveFactor, CURVE_EXAGGERATION);

      const velocity = BASE_SPEED * fatigue * (burst ? 1.2 : 1) * curveBoost * speedMultiplier;
      const nextDist = currentDist + velocity * delta;

      if (DEBUG) {
        console.log(`[KD] ⏱️ ${horse.name} | dist ${currentDist.toFixed(2)} → ${nextDist.toFixed(2)} | speed ${velocity.toFixed(3)}`);
      }

      if (nextDist >= pathLength - EPSILON) {
        if (!finishedHorses.has(id)) {
          finishedHorses.add(id);
          lapFinished.add(id);
          resultOrder.push({ id, name: horse.name, localId: horse.localId, timeMs: performance.now() });

          if (DEBUG) {
            console.log(`[KD] 🏁 Finished: ${horse.name} | at ${nextDist.toFixed(2)} / ${pathLength}`);
          }
        }
        return;
      }

      allFinished = false;
      sprite.__distance = nextDist;

      const { x, y, rotation } = getPointAtDistance(nextDist);
      sprite.x = x;
      sprite.y = y;
      sprite.rotation = rotation;

      if (label) {
        label.x = x;
        label.y = y - 20;
      }

      if (!replayLog.has(id)) replayLog.set(id, []);
      replayLog.get(id).push({
        time: performance.now(),
        distance: nextDist,
        speed: velocity,
        fatigue,
        burst,
        curveFactor,
        x,
        y,
        localId: horse.localId
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
  app.__raceTicker = ticker;

  if (DEBUG) {
    console.log('[KD] 🎬 Race ticker added and running:', app.ticker?.started ?? 'unknown');
  }
}

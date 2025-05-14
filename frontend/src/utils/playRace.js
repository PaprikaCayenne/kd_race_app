// File: frontend/src/utils/playRace.js
// Version: v1.1.9 — Isolates curveFactor effect and throttles logging

const BASE_SPEED = 0.00019;
const DEBUG_ROTATION = true;
const DEBUG_LOG_INTERVAL = 10;

export function playRace({ app, horseSprites, horsePaths, labelSprites, finishedHorses, horses, onRaceEnd, speedMultiplier = 1 }) {
  const lapFinished = new Set();
  const resultOrder = [];
  let winnerDeclared = false;
  const speedProfiles = new Map();
  const effectTimers = new Map();
  const replayLog = new Map();
  const frameCounts = new Map();

  console.log('[KD] 🎬 Starting race via playRace');
  console.log('[KD] 🚩 Horses in race:', [...horseSprites.keys()]);

  if (app.__raceTicker) {
    app.ticker.remove(app.__raceTicker);
    app.__raceTicker = null;
  }

  const ticker = (delta) => {
    const now = performance.now();

    horseSprites.forEach((sprite, localId) => {
      const pathData = horsePaths[localId];
      if (!pathData?.path || pathData.path.length < 2 || finishedHorses.has(localId)) return;

      const path = pathData.path;
      const finishIndex = pathData.debug?.finishIndex;
      if (finishIndex == null) return;

      const currentIdx = Math.floor(sprite.__progress * path.length);
      if (currentIdx >= finishIndex) {
        if (!lapFinished.has(localId)) {
          lapFinished.add(localId);
          finishedHorses.add(localId);

          const horseObj = horses.find(h => h.id === sprite.__horseId);
          const name = horseObj?.name ?? `Horse_${localId}`;
          const dbId = sprite.__horseId ?? horseObj?.id ?? localId;
          const raceIndex = sprite.__localIndex ?? localId;

          console.log(`[KD] 🐎 Finished: ${name} DB_ID: ${dbId}, ID=${raceIndex}`);

          if (!winnerDeclared) {
            console.log(`[KD] 🏆 Winner: ${name} DB_ID: ${dbId}, ID=${raceIndex}`);
            winnerDeclared = true;
          }

          resultOrder.push({ name, dbId, localId: raceIndex, frames: replayLog.get(localId) });

          if (lapFinished.size === horses.length) {
            console.log('[KD] 🏁 All horses finished!');
            resultOrder.forEach((h, i) => {
              console.log(`[KD] ${i + 1}st: ${h.name} DB_ID: ${h.dbId}, ID=${h.localId}`);
            });

            if (typeof playRace.onReplayReady === 'function') {
              playRace.onReplayReady({
                horses: resultOrder.map((h, i) => ({
                  place: i + 1,
                  name: h.name,
                  dbId: h.dbId,
                  localId: h.localId,
                  frames: h.frames
                }))
              });
            }

            if (typeof onRaceEnd === 'function') {
              setTimeout(() => onRaceEnd(), 100);
            }
          }
        }
        return;
      }

      if (!sprite.__started) {
        sprite.__started = true;
        sprite.__progress = 0.001;
        const curr = path[0];
        const next = path[1];
        sprite.position.set(curr.x, curr.y);
        sprite.__rotation = Math.atan2(next.y - curr.y, next.x - curr.x);
        sprite.rotation = sprite.__rotation;
        sprite.__lastRotation = sprite.__rotation;
        const label = labelSprites.get(localId);
        if (label) label.position.set(curr.x, curr.y);
        speedProfiles.set(localId, {});
        effectTimers.set(localId, {});
        replayLog.set(localId, []);
        frameCounts.set(localId, 0);
        return;
      }

      let curveFactor = 1;
      if (currentIdx > 0 && currentIdx < path.length - 2) {
        const prev = path[currentIdx - 1];
        const curr = path[currentIdx];
        const next = path[currentIdx + 1];
        const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let angleDiff = Math.abs(a2 - a1);
        if (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);
        const curveIntensity = angleDiff / Math.PI;
        curveFactor = 1 + (curveIntensity * 5.0); // exaggerated boost
      }

      const finalSpeed = BASE_SPEED * curveFactor;
      sprite.__progress += finalSpeed * delta;

      const count = (frameCounts.get(localId) || 0) + 1;
      frameCounts.set(localId, count);
      if (count % DEBUG_LOG_INTERVAL === 0) {
        console.log(`[KD] 🌀 Horse ${localId} | curveFactor=${curveFactor.toFixed(2)} | finalSpeed=${finalSpeed.toFixed(6)} | pct=${sprite.__progress.toFixed(3)}`);
      }

      const idx = Math.floor(sprite.__progress * path.length);
      const cappedIdx = Math.min(idx, path.length - 2);
      const curr = path[cappedIdx];
      const next = path[cappedIdx + 1];
      const lerpT = (sprite.__progress * path.length) - cappedIdx;
      const x = curr.x + (next.x - curr.x) * lerpT;
      const y = curr.y + (next.y - curr.y) * lerpT;

      sprite.position.set(x, y);

      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      let desired = Math.atan2(dy, dx);

      let last = sprite.__lastRotation ?? desired;
      while (desired - last > Math.PI) desired -= 2 * Math.PI;
      while (desired - last < -Math.PI) desired += 2 * Math.PI;
      sprite.__lastRotation = desired;
      sprite.rotation = desired;

      const label = labelSprites.get(localId);
      if (label) label.position.set(x, y);

      replayLog.get(localId).push({
        pct: sprite.__progress,
        timeMs: now,
        speed: finalSpeed,
        curveFactor
      });
    });
  };

  app.ticker.add(ticker);
  app.__raceTicker = ticker;
}

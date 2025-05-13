// File: frontend/src/utils/playRace.js
// Version: v1.0.1 — Fixes curveFactor to speed up horses in corners instead of slowing them

const BASE_SPEED = 0.00009;

export function playRace({ app, horseSprites, horsePaths, labelSprites, finishedHorses, horses, onRaceEnd, speedMultiplier = 1 }) {
  const lapFinished = new Set();
  const resultOrder = [];
  let winnerDeclared = false;
  const speedProfiles = new Map();
  const effectTimers = new Map();
  const replayLog = new Map();

  console.log('[KD] 🎬 Starting race via playRace');
  console.log('[KD] 🚩 Horses in race:', [...horseSprites.keys()]);

  if (app.__raceTicker) {
    app.ticker.remove(app.__raceTicker);
    app.__raceTicker = null;
  }

  const ticker = (delta) => {
    const now = performance.now();
    const allProgress = Array.from(horseSprites.values()).map(s => s.__progress || 0);
    const medianProgress = allProgress.sort()[Math.floor(allProgress.length / 2)];

    horseSprites.forEach((sprite, localId) => {
      const pathData = horsePaths[localId];
      if (!pathData?.path || pathData.path.length < 2 || finishedHorses.has(localId)) return;

      const path = pathData.path;
      const speedMap = pathData.speedMap || [];
      const finishIndex = pathData.debug?.finishIndex;
      if (finishIndex == null) return;

      if (!sprite.__started) {
        sprite.__started = true;
        sprite.__progress = 0.001;
        const curr = path[0];
        const next = path[1];
        sprite.position.set(curr.x, curr.y);
        sprite.__rotation = Math.atan2(next.y - curr.y, next.x - curr.x);
        sprite.rotation = sprite.__rotation;
        const label = labelSprites.get(localId);
        if (label) label.position.set(curr.x, curr.y);
        const profile = {
          base: 1 + (Math.random() * 0.1 - 0.05),
          variance: 0.15 + Math.random() * 0.1,
          burstChance: 0.002 + Math.random() * 0.002,
          fatigueChance: 0.002 + Math.random() * 0.002,
          burstMultiplier: 1.3,
          fatigueMultiplier: 0.7,
          curveHandling: 0.7 + Math.random() * 0.6,
          rotationResponsiveness: 1 + Math.random() * 0.5,
          stamina: 100 + Math.random() * 50,
          fatigueLevel: 0,
          fatigueRecoveryRate: 1 + Math.random()
        };
        speedProfiles.set(localId, profile);
        effectTimers.set(localId, { burst: 0, fatigue: 0 });
        replayLog.set(localId, []);
        return;
      }

      const profile = speedProfiles.get(localId);
      const timers = effectTimers.get(localId);
      const currentIdx = Math.floor(sprite.__progress * path.length);
      const pathSpeedFactor = speedMap[currentIdx] ?? 1;

      if (timers.burst <= 0 && timers.fatigue <= 0) {
        const rand = Math.random();
        if (rand < profile.burstChance && profile.stamina > 40) timers.burst = 20 + Math.floor(Math.random() * 20);
        else if (rand < profile.burstChance + profile.fatigueChance && profile.stamina < 60) timers.fatigue = 20 + Math.floor(Math.random() * 20);
      }

      let speedFactor = profile.base;
      let isBursting = false;
      let isFatigued = false;

      if (timers.burst > 0) {
        speedFactor *= profile.burstMultiplier;
        timers.burst--;
        isBursting = true;
        profile.stamina -= 2;
      } else if (timers.fatigue > 0) {
        speedFactor *= profile.fatigueMultiplier;
        timers.fatigue--;
        isFatigued = true;
        profile.stamina += profile.fatigueRecoveryRate;
      } else {
        profile.stamina = Math.max(0, Math.min(120, profile.stamina + profile.fatigueRecoveryRate));
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
        curveFactor = 1 + (curveIntensity * 0.04); // 💡 Always slightly speeds up on curves
      }

      const gap = sprite.__progress - medianProgress;
      let packBias = 1;
      if (gap > 0.05) packBias = 0.98;
      else if (gap < -0.05) packBias = 1.02;

      const jitter = (Math.random() * 2 - 1) * profile.variance;
      const finalSpeed = BASE_SPEED * speedFactor * pathSpeedFactor * curveFactor * packBias * (1 + jitter);
      sprite.__progress += finalSpeed * delta * speedMultiplier;

      const idx = Math.floor(sprite.__progress * path.length);
      const cappedIdx = Math.min(idx, path.length - 2);
      const curr = path[cappedIdx];
      const next = path[cappedIdx + 1];
      const lerpT = (sprite.__progress * path.length) - cappedIdx;
      const x = curr.x + (next.x - curr.x) * lerpT;
      const y = curr.y + (next.y - curr.y) * lerpT;

      if (!lapFinished.has(localId) && currentIdx >= finishIndex) {
        lapFinished.add(localId);
        finishedHorses.add(localId);

        const horseObj = horses.find(h => h.id === localId);
        const name = horseObj?.name ?? 'Unknown';
        const dbId = horseObj?.id ?? localId;

        console.log(`[KD] 🐎 Finished: ${name} ID: ${dbId}, localId=${localId}`);

        if (!winnerDeclared) {
          console.log(`[KD] 🏆 Winner: ${name} ID: ${dbId}, localId=${localId}`);
          winnerDeclared = true;
        }

        resultOrder.push({ name, dbId, localId, frames: replayLog.get(localId) });

        if (lapFinished.size === horses.length) {
          console.log('[KD] 🏁 All horses finished!');
          resultOrder.forEach((h, i) => {
            console.log(`[KD] ${i + 1}st: ${h.name} ID: ${h.dbId}, localId=${h.localId}`);
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

      sprite.position.set(x, y);

      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1e-2) return;

      const desired = Math.atan2(dy, dx);
      let current = sprite.__rotation ?? 0;
      let deltaRot = desired - current;
      while (deltaRot > Math.PI) deltaRot -= 2 * Math.PI;
      while (deltaRot < -Math.PI) deltaRot += 2 * Math.PI;

      const scaledRotation = finalSpeed * 1500 * profile.rotationResponsiveness;
      const maxDelta = Math.min(0.2, Math.max(0.005, scaledRotation));
      deltaRot = Math.max(-maxDelta, Math.min(maxDelta, deltaRot));
      sprite.__rotation = current + deltaRot;
      sprite.rotation = sprite.__rotation;

      const label = labelSprites.get(localId);
      if (label) label.position.set(x, y);

      replayLog.get(localId).push({
        pct: sprite.__progress,
        timeMs: now,
        speed: finalSpeed,
        fatigue: profile.stamina,
        isBursting,
        isFatigued
      });
    });
  };

  app.ticker.add(ticker);
  app.__raceTicker = ticker;
}

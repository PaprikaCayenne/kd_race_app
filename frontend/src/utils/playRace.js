// File: frontend/src/utils/playRace.js
// Version: v4.9.0 — Persists replay frames and emits canonical race:finish payload
// Date: 2026-02-18

import BezierEasing from 'bezier-easing';

const TICK_INTERVAL = 1000 / 30;
const EASING = BezierEasing(0.42, 0, 0.58, 1);
const FINISH_PROXIMITY_PX = 4;

export function playRace({
  app,
  socket,
  raceId,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = 2.2,
  debugVisible = false,
  raceDurationSeconds = 10,
  setLiveRanking = () => {}
}) {
  const finished = new Set();
  const results = [];
  const distanceMap = new Map();
  const startTimeMap = new Map();
  const replayFrames = [];

  const raceStartTime = performance.now();

  horses.forEach((horse) => {
    const key = horse.localId;
    const path = horsePaths.get(key);
    const trueFinish = path?.trueFinish;

    if (!path || !trueFinish || typeof path.getPointAtDistance !== 'function') {
      console.error(`[KD] ❌ Invalid path or trueFinish for horse ${horse.name} (localId=${key})`);
      return;
    }

    if (!horse.racePacingPlan) {
      console.warn(`[KD] ⚠️ Missing racePacingPlan for horse ${horse.name}`);
    }

    distanceMap.set(key, 0);
    startTimeMap.set(key, raceStartTime);
  });

  const ticker = setInterval(() => {
    const now = performance.now();
    const raceElapsed = Math.max(0, Math.round(now - raceStartTime));

    horses.forEach((horse) => {
      const key = horse.localId;
      const path = horsePaths.get(key);
      const sprite = horseSprites.get(key);
      const label = labelSprites.get(key);
      const trueFinish = path?.trueFinish;
      const plan = horse.racePacingPlan;

      if (!sprite || !label || !path || !plan || !trueFinish) return;
      if (finished.has(key)) return;

      let distance = distanceMap.get(key);
      const start = startTimeMap.get(key);
      const elapsed = now - start;

      let speed = plan.baseSpeed;
      for (const mod of plan.modifiers) {
        if (elapsed >= mod.startMs && elapsed <= mod.startMs + mod.durationMs) {
          const pct = (elapsed - mod.startMs) / mod.durationMs;
          const eased = EASING(pct);
          speed *= mod.multiplier > 1
            ? 1 + (mod.multiplier - 1) * eased
            : 1 - (1 - mod.multiplier) * eased;
        }
      }

      speed *= speedMultiplier;
      distance += speed;

      const point = path.getPointAtDistance(distance);
      const dx = point.x - trueFinish.x;
      const dy = point.y - trueFinish.y;
      const pixelDelta = Math.sqrt(dx * dx + dy * dy);

      const justCrossed = distance > 30 && pixelDelta <= FINISH_PROXIMITY_PX;

      if (justCrossed) {
        finished.add(key);
        sprite.tint = 0x888888;
        label.style.fill = 0x888888;

        results.push({
          id: horse.id,
          localId: horse.localId,
          name: horse.name,
          finalSpeed: speed,
          finishTimeMs: Math.round(elapsed)
        });

        distanceMap.set(key, path.arcLength);
        replayFrames.push({
          horseId: horse.id,
          localId: horse.localId,
          pct: 1,
          timeMs: raceElapsed
        });
        return;
      }

      distanceMap.set(key, distance);

      const next = path.getPointAtDistance(distance + 1);
      if (!point || !next) return;

      sprite.x = point.x;
      sprite.y = point.y;
      sprite.rotation = Math.atan2(next.y - point.y, next.x - point.x);
      label.x = point.x;
      label.y = point.y - 20;

      const safeArc = Math.max(1, path.arcLength || 1);
      replayFrames.push({
        horseId: horse.id,
        localId: horse.localId,
        pct: Math.max(0, Math.min(1, distance / safeArc)),
        timeMs: raceElapsed
      });
    });

    const ranked = [...horses]
      .filter(h => distanceMap.has(h.localId))
      .map(h => ({
        id: h.id,
        localId: h.localId,
        name: h.name,
        saddleHex: h.saddleHex,
        bodyHex: h.bodyHex,
        dist: distanceMap.get(h.localId) || 0
      }))
      .sort((a, b) => b.dist - a.dist);

    ranked.forEach((horseRank, idx) => {
      const sprite = horseSprites.get(horseRank.localId);
      if (sprite) sprite.zIndex = 20 + (horses.length - idx);
    });

    setLiveRanking(ranked.map(({ id, name, saddleHex, bodyHex }) => ({
      id,
      name,
      saddleHex: saddleHex || '#888888',
      bodyHex: bodyHex || '#a0522d'
    })));

    if (finished.size === horses.length) {
      const sorted = [...results].sort((a, b) => a.finishTimeMs - b.finishTimeMs);

      const payload = {
        raceId,
        results: sorted.map((r, i) => ({
          horseId: r.id,
          position: i + 1,
          timeMs: r.finishTimeMs,
          localId: r.localId
        })),
        replayFrames
      };

      if (socket && socket.connected) {
        socket.emit('race:finish', payload);
      } else {
        fetch('/api/admin/save-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pass': '6a2e8819c6fb4c15'
          },
          body: JSON.stringify(payload)
        }).catch(console.error);
      }

      onRaceEnd(sorted);
      clearInterval(ticker);
    }
  }, TICK_INTERVAL);
}

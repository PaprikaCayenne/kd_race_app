// File: frontend/src/utils/playRace.js
// Version: v4.8.0 — Adds setLiveRanking for real-time race position overlay
// Date: 2025-05-30

import BezierEasing from 'bezier-easing';

const TICK_INTERVAL = 1000 / 30;
const EASING = BezierEasing(0.42, 0, 0.58, 1);
const FINISH_PROXIMITY_PX = 4;

export function playRace({
  app,
  raceId,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = 1,
  debugVisible = false,
  raceDurationSeconds = 10,
  setLiveRanking = () => {} // 🆕 optional live ranking updater
}) {
  const finished = new Set();
  const results = [];
  const distanceMap = new Map();
  const startTimeMap = new Map();

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
    });

    // 🆕 Live Ranking Update
    const ranked = [...horses]
      .filter(h => distanceMap.has(h.localId))
      .map(h => ({
        id: h.id,
        name: h.name,
        dist: distanceMap.get(h.localId) || 0
      }))
      .sort((a, b) => b.dist - a.dist);

    setLiveRanking(ranked.map(({ id, name }) => ({ id, name })));

    // 🏁 All finished
    if (finished.size === horses.length) {
      console.log('[KD] ✅ All horses finished — syncing with backend');
      const sorted = [...results].sort((a, b) => a.finishTimeMs - b.finishTimeMs);
      sorted.forEach((r, i) =>
        console.log(`🏁 ${i + 1}${getOrdinal(i + 1)}: ${r.name} — ${r.finishTimeMs}ms`)
      );

      const payload = {
        raceId,
        results: sorted.map((r, i) => ({
          horseId: r.id,
          position: i + 1,
          timeMs: r.finishTimeMs,
          localId: r.localId
        }))
      };

      const socket = window?.socket;
      if (socket && socket.connected) {
        socket.emit("race:finish", payload);
        console.log("📤 [KD] Emitted race:finish via socket");
      } else {
        console.warn("⚠️ [KD] Socket not connected — falling back to HTTP");
        fetch("/api/admin/save-results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-pass": "6a2e8819c6fb4c15"
          },
          body: JSON.stringify(payload)
        }).then((res) => {
          if (!res.ok) throw new Error("❌ Failed to save race results");
          console.log("✅ [KD] Race results saved to backend");
        }).catch(console.error);
      }

      onRaceEnd(sorted);
      clearInterval(ticker);
    }
  }, TICK_INTERVAL);
}

function getOrdinal(n) {
  return ['st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10 - 1] || 'th';
}

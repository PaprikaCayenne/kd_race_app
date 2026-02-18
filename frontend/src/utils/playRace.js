// File: frontend/src/utils/playRace.js

import BezierEasing from 'bezier-easing';
import { RACE_SPEED_MULTIPLIER, sortHorsesByDistance } from '@/utils/raceMath';

const TICK_INTERVAL = 1000 / 30;
const EASING = BezierEasing(0.42, 0, 0.58, 1);

export function playRace({
  socket,
  raceId,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  speedMultiplier = RACE_SPEED_MULTIPLIER,
  raceDurationSeconds = 10,
  setLiveRanking = () => {}
}) {
  const winnersByOrder = [];
  const stopped = new Set();
  const distanceMap = new Map();
  const startTimeMap = new Map();
  const replayFrames = [];

  const raceStartTime = performance.now();

  horses.forEach((horse) => {
    const path = horsePaths.get(horse.localId);
    if (!path || typeof path.getPointAtDistance !== 'function') return;
    distanceMap.set(horse.localId, path.startDistance || 0);
    startTimeMap.set(horse.localId, raceStartTime);
  });

  const ticker = setInterval(() => {
    const now = performance.now();
    const raceElapsed = Math.max(0, Math.round(now - raceStartTime));

    horses.forEach((horse) => {
      const key = horse.localId;
      const path = horsePaths.get(key);
      const sprite = horseSprites.get(key);
      const label = labelSprites.get(key);
      const plan = horse.racePacingPlan;

      if (!sprite || !label || !path || !plan) return;
      if (stopped.has(key)) return;

      let distance = distanceMap.get(key) ?? 0;
      const start = startTimeMap.get(key) ?? raceStartTime;
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

      const winningDistance = path.winningDistance ?? path.arcLength;
      const stopDistance = path.stopDistance ?? path.arcLength;

      if (distance >= winningDistance && !winnersByOrder.find((w) => w.localId === key)) {
        winnersByOrder.push({
          id: horse.id,
          localId: key,
          name: horse.name,
          finishTimeMs: Math.round(elapsed)
        });
      }

      if (distance >= stopDistance) {
        distance = stopDistance;
        stopped.add(key);
      }

      distanceMap.set(key, distance);

      const point = path.getPointAtDistance(distance);
      const next = path.getPointAtDistance(Math.min(distance + 1, stopDistance));
      if (!point || !next) return;

      sprite.x = point.x;
      sprite.y = point.y;
      sprite.rotation = Math.atan2(next.y - point.y, next.x - point.x);
      label.x = point.x;
      label.y = point.y - 20;

      const replayPct = Math.max(0, Math.min(1, distance / Math.max(1, path.arcLength || 1)));
      replayFrames.push({ horseId: horse.id, localId: key, pct: replayPct, timeMs: raceElapsed });
    });

    const ranked = sortHorsesByDistance(horses, distanceMap);
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

    if (stopped.size === horses.length) {
      const results = winnersByOrder.map((r, i) => ({
        horseId: r.id,
        position: i + 1,
        timeMs: r.finishTimeMs,
        localId: r.localId
      }));

      const payload = { raceId, results, replayFrames };

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

      onRaceEnd(results);
      clearInterval(ticker);
    }
  }, TICK_INTERVAL);
}

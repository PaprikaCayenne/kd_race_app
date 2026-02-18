// File: frontend/src/utils/playRace.js
// Version: v2.3.0 — Emits first-finish event for winner panel and shared live ordering
// Date: 2026-02-18

import BezierEasing from 'bezier-easing';
import { RACE_SPEED_MULTIPLIER, getNormalizedProgress, sortHorsesByDistance } from '@/utils/raceMath';

const TICK_INTERVAL = 1000 / 30;
const EASING = BezierEasing(0.42, 0, 0.58, 1);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function playRace({
  socket,
  raceId,
  horseSprites,
  horsePaths,
  labelSprites,
  horses,
  onRaceEnd,
  onFirstFinish = () => {},
  speedMultiplier = RACE_SPEED_MULTIPLIER,
  raceDurationSeconds = 10,
  setLiveRanking = () => {}
}) {
  const winnersByOrder = [];
  const stopped = new Set();
  const distanceMap = new Map();
  const startTimeMap = new Map();
  const speedMap = new Map();
  const replayFrames = [];
  let lastOrderEmit = 0;
  let firstFinishEmitted = false;

  const raceStartTime = performance.now();

  horses.forEach((horse) => {
    const path = horsePaths.get(horse.localId);
    if (!path || typeof path.getPointAtDistance !== 'function') return;
    distanceMap.set(horse.localId, path.startDistance || 0);
    startTimeMap.set(horse.localId, raceStartTime);
    speedMap.set(horse.localId, horse.racePacingPlan?.baseSpeed || 0);
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

      let targetSpeed = plan.baseSpeed;
      for (const mod of plan.modifiers) {
        if (elapsed >= mod.startMs && elapsed <= mod.startMs + mod.durationMs) {
          const pct = (elapsed - mod.startMs) / mod.durationMs;
          const eased = EASING(pct);
          targetSpeed *= mod.multiplier > 1
            ? 1 + (mod.multiplier - 1) * eased
            : 1 - (1 - mod.multiplier) * eased;
        }
      }

      targetSpeed *= speedMultiplier;

      const previousSpeed = speedMap.get(key) ?? targetSpeed;
      const maxDelta = Math.max(0.24, targetSpeed * 0.1);
      const smoothedSpeed = previousSpeed + clamp(targetSpeed - previousSpeed, -maxDelta, maxDelta);
      const boundedSpeed = clamp(smoothedSpeed, plan.baseSpeed * speedMultiplier * 0.62, plan.baseSpeed * speedMultiplier * 1.45);
      speedMap.set(key, boundedSpeed);

      distance += boundedSpeed;

      const winningDistance = path.winningDistance ?? path.arcLength;
      const stopDistance = path.stopDistance ?? path.arcLength;
      const winningNormalized = getNormalizedProgress(winningDistance, path.arcLength);
      const stopNormalized = getNormalizedProgress(stopDistance, path.arcLength);
      const normalized = getNormalizedProgress(distance, path.arcLength);

      if (normalized >= winningNormalized && !winnersByOrder.find((w) => w.localId === key)) {
        winnersByOrder.push({
          id: horse.id,
          localId: key,
          name: horse.name,
          finishTimeMs: Math.round(elapsed)
        });

        if (!firstFinishEmitted) {
          firstFinishEmitted = true;
          onFirstFinish({ horseId: horse.id, localId: key, finishTimeMs: Math.round(elapsed) });
        }
      }

      if (normalized >= stopNormalized || distance >= stopDistance) {
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

      replayFrames.push({
        horseId: horse.id,
        localId: key,
        pct: getNormalizedProgress(distance, Math.max(1, path.arcLength || 1)),
        timeMs: raceElapsed
      });
    });

    const ranked = sortHorsesByDistance(horses, distanceMap, horsePaths);
    ranked.forEach((horseRank, idx) => {
      const sprite = horseSprites.get(horseRank.localId);
      if (sprite) sprite.zIndex = 20 + (horses.length - idx);
    });

    const publicRanking = ranked.map(({ id, localId, name, saddleHex, bodyHex, normalizedProgress }) => ({
      id,
      localId,
      name,
      normalizedProgress,
      saddleHex: saddleHex || '#888888',
      bodyHex: bodyHex || '#a0522d'
    }));

    setLiveRanking(publicRanking.map(({ id, name, saddleHex, bodyHex }) => ({ id, name, saddleHex, bodyHex })));

    if (socket?.connected && now - lastOrderEmit >= 200) {
      socket.emit('race:order', {
        raceId,
        elapsedMs: raceElapsed,
        ranking: publicRanking
      });
      lastOrderEmit = now;
    }

    if (stopped.size === horses.length) {
      const finishTimes = new Map(winnersByOrder.map((row) => [row.localId, row.finishTimeMs]));
      const finalRanking = sortHorsesByDistance(horses, distanceMap, horsePaths);

      const results = finalRanking.map((r, i) => ({
        horseId: r.id,
        position: i + 1,
        timeMs: finishTimes.get(r.localId) ?? raceElapsed,
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

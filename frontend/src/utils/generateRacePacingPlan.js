// File: frontend/src/utils/generateRacePacingPlan.js
// Version: v2.3.0 — Fixes lane fairness by removing lane bias from baseSpeed
// Date: 2025-05-29

import { mean } from 'd3-array';
import { clamp } from 'lodash-es';
import BezierEasing from 'bezier-easing';

export function generateRacePacingPlan(horses, horsePaths, raceDurationSeconds = 60) {
  const TICK_RATE = 30; // ticks per second
  const TICK_MS = 1000 / TICK_RATE;
  const TARGET_TICKS = raceDurationSeconds * TICK_RATE;
  const SPRINT_MULT = [1.15, 1.3];
  const FATIGUE_MULT = [0.75, 0.9];
  const EASING = BezierEasing(0.42, 0, 0.58, 1); // easeInOut

  // Phase 1: Draft plans
  const arcLengths = horses.map(h => horsePaths.get(h.localId)?.arcLength || 3000);
  const avgArc = mean(arcLengths);

  horses.forEach((horse, i) => {
    const arcLength = horsePaths.get(horse.localId)?.arcLength || avgArc;
    const role = ['front-runner', 'comeback', 'volatile'][i % 3];
    const baseSpeed = (arcLength / TARGET_TICKS) * randBetween(0.95, 1.05);

    const modifiers = [];
    const totalDuration = arcLength / baseSpeed * TICK_MS;
    const modCount = Math.floor(Math.random() * 3) + 3;

    for (let j = 0; j < modCount; j++) {
      const type = Math.random() > 0.5 ? 'sprint' : 'fatigue';
      const start = Math.random() * totalDuration * 0.85;
      const duration = Math.random() * 1500 + 1000;
      const mult = type === 'sprint'
        ? randBetween(SPRINT_MULT[0], SPRINT_MULT[1])
        : randBetween(FATIGUE_MULT[0], FATIGUE_MULT[1]);

      modifiers.push({
        type,
        startMs: Math.floor(start),
        durationMs: Math.floor(duration),
        multiplier: parseFloat(mult.toFixed(2))
      });
    }

    modifiers.sort((a, b) => a.startMs - b.startMs);

    horse.racePacingPlan = {
      role,
      baseSpeed: parseFloat(baseSpeed.toFixed(3)),
      modifiers
    };
  });

  // Phase 2: Simulate race
  const tickData = horses.map(h => {
    const plan = h.racePacingPlan;
    const arc = horsePaths.get(h.localId)?.arcLength || avgArc;
    const ticks = [];
    let dist = 0;
    let t = 0;
    while (dist < arc) {
      let speed = plan.baseSpeed;
      for (const mod of plan.modifiers) {
        if (t >= mod.startMs && t <= mod.startMs + mod.durationMs) {
          const pct = (t - mod.startMs) / mod.durationMs;
          const eased = EASING(pct);
          speed *= mod.multiplier > 1
            ? 1 + (mod.multiplier - 1) * eased
            : 1 - (1 - mod.multiplier) * eased;
        }
      }
      dist += speed;
      ticks.push({ t, dist });
      t += TICK_MS;
    }
    return { horseId: h.id, localId: h.localId, ticks, finalDist: dist, finalTime: t };
  });

  // Phase 3: Adjust pacing if needed
  const finishTimes = tickData.map(d => d.finalTime);
  const meanTime = mean(finishTimes);
  const timeSpread = Math.max(...finishTimes) - Math.min(...finishTimes);

  if (timeSpread > 8000) {
    tickData.forEach((data) => {
      const horse = horses.find(h => h.localId === data.localId);
      const delta = data.finalTime - meanTime;
      const adjust = clamp(-delta / 5000, -0.08, 0.08);

      horse.racePacingPlan.baseSpeed = parseFloat(
        (horse.racePacingPlan.baseSpeed * (1 + adjust)).toFixed(3)
      );
    });
  }

  return horses;

  function randBetween(min, max) {
    return Math.random() * (max - min) + min;
  }
}

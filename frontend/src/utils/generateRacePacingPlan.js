// File: frontend/src/utils/generateRacePacingPlan.js
// Version: v2.4.0 — Uses seeded pacing plans keyed by race and keeps momentum variability stable
// Date: 2026-02-18

import { mean } from 'd3-array';
import { clamp } from 'lodash-es';
import BezierEasing from 'bezier-easing';
import seedrandom from 'seedrandom';

export function generateRacePacingPlan(horses, horsePaths, raceDurationSeconds = 60, seed = 'race-default') {
  const TICK_RATE = 30;
  const TICK_MS = 1000 / TICK_RATE;
  const TARGET_TICKS = raceDurationSeconds * TICK_RATE;
  const SPRINT_MULT = [1.08, 1.22];
  const FATIGUE_MULT = [0.82, 0.94];
  const EASING = BezierEasing(0.42, 0, 0.58, 1);
  const rng = seedrandom(String(seed));

  const arcLengths = horses.map((h) => horsePaths.get(h.localId)?.arcLength || 3000);
  const avgArc = mean(arcLengths) || 3000;

  horses.forEach((horse, i) => {
    const arcLength = horsePaths.get(horse.localId)?.arcLength || avgArc;
    const role = ['front-runner', 'comeback', 'volatile'][i % 3];
    const baseSpeed = (arcLength / TARGET_TICKS) * randBetween(0.97, 1.03);

    const modifiers = [];
    const totalDuration = (arcLength / baseSpeed) * TICK_MS;
    const modCount = Math.floor(randBetween(0, 3)) + 3;

    for (let j = 0; j < modCount; j++) {
      const type = rng() > 0.55 ? 'sprint' : 'fatigue';
      const start = randBetween(0, totalDuration * 0.85);
      const duration = randBetween(900, 2100);
      const mult = type === 'sprint'
        ? randBetween(SPRINT_MULT[0], SPRINT_MULT[1])
        : randBetween(FATIGUE_MULT[0], FATIGUE_MULT[1]);

      modifiers.push({
        type,
        startMs: Math.floor(start),
        durationMs: Math.floor(duration),
        multiplier: Number(mult.toFixed(3))
      });
    }

    modifiers.sort((a, b) => a.startMs - b.startMs);

    horse.racePacingPlan = {
      role,
      baseSpeed: Number(baseSpeed.toFixed(4)),
      modifiers
    };
  });

  const tickData = horses.map((h) => {
    const plan = h.racePacingPlan;
    const arc = horsePaths.get(h.localId)?.arcLength || avgArc;
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
      t += TICK_MS;
    }

    return { localId: h.localId, finalTime: t };
  });

  const finishTimes = tickData.map((d) => d.finalTime);
  const meanTime = mean(finishTimes) || 0;
  const timeSpread = Math.max(...finishTimes) - Math.min(...finishTimes);

  if (timeSpread > 6500) {
    tickData.forEach((data) => {
      const horse = horses.find((h) => h.localId === data.localId);
      if (!horse?.racePacingPlan) return;
      const delta = data.finalTime - meanTime;
      const adjust = clamp(-delta / 5000, -0.06, 0.06);

      horse.racePacingPlan.baseSpeed = Number(
        (horse.racePacingPlan.baseSpeed * (1 + adjust)).toFixed(4)
      );
    });
  }

  return horses;

  function randBetween(min, max) {
    return rng() * (max - min) + min;
  }
}

// File: frontend/src/components/track/triggerStartRace.js
// Version: v1.0.1 — Validates input and calls playRace with full context

import { playRace } from '@/utils/playRace';

export function triggerStartRace({
  appRef,
  horsesRef,
  horsePathsRef,
  horseSpritesRef,
  labelSpritesRef,
  finishedHorsesRef,
  debugPathLinesRef,
  finishDotsRef,
  setRaceReady,
  setCanGenerate,
  speedMultiplier
}) {
  const app = appRef.current;
  if (!app || !horsesRef.current.length) {
    console.warn('[KD] ❌ No app or horses available to start race');
    return;
  }

  const allValid = horsesRef.current.every(h => horsePathsRef.current[h.id]?.path?.length > 1);
  if (!allValid) {
    console.warn('[KD] ⚠️ Some horses are missing path data — race not started.');
    return;
  }

  setRaceReady(false);
  playRace({
    app,
    horseSprites: horseSpritesRef.current,
    horsePaths: horsePathsRef.current,
    labelSprites: labelSpritesRef.current,
    finishedHorses: finishedHorsesRef.current,
    horses: horsesRef.current,
    onRaceEnd: () => setCanGenerate(true),
    debugPathLinesRef,
    finishDotsRef,
    speedMultiplier
  });
}

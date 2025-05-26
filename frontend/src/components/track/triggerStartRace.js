// File: frontend/src/components/track/triggerStartRace.js
// Version: v1.1.4 — Adds debugVisible to playRace()
// Date: 2025-05-24

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
  speedMultiplier,
  debugVisible // ✅ ADD: receive debug toggle state
}) {
  console.log('[KD] ▶️ triggerStartRace.js v1.1.4');

  const app = appRef.current;
  const horses = horsesRef.current;
  const horsePaths = horsePathsRef.current;

  if (!app || !horses?.length) {
    console.warn('[KD] ❌ No app or horses available to start race');
    return;
  }

  if (!(horsePaths instanceof Map)) {
    console.error('[KD] ❌ horsePathsRef must be a Map');
    return;
  }

  console.log('[KD] 🧪 Validating path data for horses (dbId, localId):');
  const missing = horses.filter(h => {
    const pathData = horsePaths.get(h.id);
    const valid = pathData?.path && pathData.path.length >= 2;
    console.log(`   ↪️ Horse ${h.name} | dbId=${h.id} | localId=${h.localId} | Path valid: ${!!valid}`);
    return !valid;
  });

  if (missing.length > 0) {
    console.warn('[KD] ⚠️ Some horses are missing path data — race not started.');
    missing.forEach(h => {
      console.warn(`[KD] ⚠️ Missing path for horse ${h.name} | dbId=${h.id} | localId=${h.localId}`);
    });
    return;
  }

  console.log('[KD] ✅ All horses have valid path data — preparing race');
  console.log('[KD] 🎯 speedMultiplier passed to playRace():', speedMultiplier);
  console.log('[KD] 🎯 debugVisible passed to playRace():', debugVisible);

  console.log('[KD] 🔎 Final horse IDs in race:', horses.map(h => h.id));
  console.log('[KD] 🔎 horseSpritesRef keys:', Array.from(horseSpritesRef.current?.keys?.() ?? []));
  console.log('[KD] 🔎 horsePathsRef keys:', Array.from(horsePathsRef.current?.keys?.() ?? []));
  console.log('[KD] 🧩 horseSpritesRef identity at race start:', horseSpritesRef.current);
  console.log('[KD] 🧩 horsePathsRef identity at race start:', horsePathsRef.current);

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
    speedMultiplier,
    debugVisible // ✅ PASS INTO playRace()
  });
}

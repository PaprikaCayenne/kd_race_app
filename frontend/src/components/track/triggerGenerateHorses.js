// File: frontend/src/components/track/triggerGenerateHorses.js
// Version: v1.4.2 — Ensures horsesRef includes localId; adds debug log before assignment

import { generateHorsePaths } from '@/utils/generateHorsePaths';
import { setupHorses } from './setupHorses';
import { logInfo } from './debugConsole';

export async function triggerGenerateHorses({
  app,
  trackData,
  horsesRef,
  horseSpritesRef,
  labelSpritesRef,
  finishedHorsesRef,
  debugPathLinesRef,
  debugDotsRef,
  finishDotsRef,
  startDotsRef,
  horsePathsRef,
  width,
  height,
  startAtPercent,
  setRaceReady,
  setCanGenerate,
  usedHorseIdsRef,
  debugVisible
}) {
  try {
    await fetch('/api/admin/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pass': '6a2e8819c6fb4c15'
      },
      body: JSON.stringify({ startAtPercent, width, height })
    });
  } catch (err) {
    console.error('[KD] ❌ Error triggering race:', err);
    return;
  }

  const { laneCount, lanes, spriteWidth, centerline } = trackData;

  let horses = [];
  try {
    const res = await fetch('/api/horses');
    const allHorses = await res.json();

    const usedSet = usedHorseIdsRef?.current || new Set();
    const unused = allHorses.filter(h => !usedSet.has(h.id));
    const selected = unused.slice(0, laneCount);

    horses = selected.map((h, index) => ({
      ...h,
      localId: index
    }));

    horses.forEach(h => usedSet.add(h.id));
    if (usedHorseIdsRef?.current) usedHorseIdsRef.current = usedSet;

    horses.forEach(h =>
      logInfo(`[KD] 🐴 Selected Horse: ${h.name} | dbId=${h.id} | localId=${h.localId}`)
    );
  } catch (err) {
    console.error('[KD] ❌ Failed to fetch horses:', err);
    return;
  }

  if (!horses || horses.length === 0) {
    console.error('[KD] ❌ No horses available after filtering');
    return;
  }

  logInfo('[KD] 🐴 Generating horse paths for', horses.length, 'horses');

  const horsePaths = generateHorsePaths({
    horses,
    lanes,
    centerline,
    startAtPercent,
    spriteWidth
  });

  const validHorsePaths = Object.values(horsePaths).filter(p => p?.path?.length >= 2);
  console.log('[KD] 🧪 Valid horsePaths count:', validHorsePaths.length);

  // ✅ Assign horsesRef first to preserve localId across lifecycle
  horsesRef.current = horses;
  console.log('[KD] 🧪 horsesRef.current set:', horsesRef.current.map(h => `(${h.id}, ${h.localId})`));

  setupHorses({
    app,
    horses,
    horsePaths,
    horseSpritesRef,
    labelSpritesRef,
    finishedHorsesRef,
    debugPathLinesRef,
    debugDotsRef,
    finishDotsRef,
    startDotsRef,
    horsePathsRef,
    lanes: validHorsePaths.map(p => p.path),
    debugVisible
  });

  logInfo('[KD] ✅ Horses placed and rendered');

  setRaceReady(true);
  setCanGenerate(false);

  return horsePaths;
}

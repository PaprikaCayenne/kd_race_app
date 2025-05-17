// File: frontend/src/components/track/triggerGenerateHorses.js
// Version: v1.9.0 — Fixes centerline shape passthrough to preserve arc metadata

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
  console.log('[KD] 🟡 triggerGenerateHorses() START');

  try {
    if (!trackData || typeof trackData !== 'object') {
      console.error('[KD] ❌ trackData is missing or invalid:', trackData);
      return;
    }

    const laneCount = trackData.laneCount ?? 0;
    const lanes = Array.isArray(trackData.lanes) ? trackData.lanes : [];
    const spriteWidth = trackData.spriteWidth ?? 0;

    // ✅ FIX: Use full object instead of destructuring array
    const centerline = trackData.centerline;

    if (lanes.length < laneCount) {
      console.error('[KD] ❌ lanes array is too short:', lanes);
      return;
    }

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

    let horses = [];
    try {
      const res = await fetch('/api/horses');
      const allHorses = await res.json();

      const usedSet = usedHorseIdsRef?.current || new Set();
      const unused = allHorses.filter(h => !usedSet.has(h.id));

      console.log('[KD] 🧪 Unused horses before selection:', unused.map(h => `(${h.id}, ${h.name})`));

      const selected = unused.slice(0, laneCount);
      console.log('[KD] 🧪 Selected horses:', selected.map(h => `(${h.id}, ${h.name})`));

      horses = selected.map((h, index) => {
        const mapped = { ...h, localId: index };
        console.log(`[KD] 🎯 Assigning localId=${index} to horse id=${h.id}, name=${h.name}`);
        return mapped;
      });

      horsesRef.current = horses;
      console.log('[KD] ✅ horsesRef.current set:', horses.map(h => `(${h.id}, ${h.localId})`));

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

    const horsePaths = await generateHorsePaths({
      horses,
      lanes,
      centerline,
      startAtPercent,
      spriteWidth
    });

    if (!(horsePaths instanceof Map)) {
      console.error('[KD] ❌ generateHorsePaths did not return a Map');
      return;
    }

    const validHorsePaths = Array.from(horsePaths.values()).filter(p => p?.path?.length >= 2);
    console.log('[KD] 🧪 Valid horsePaths count:', validHorsePaths.length);
    console.log('[KD] 🧪 horsePaths Map keys:', Array.from(horsePaths.keys()));

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

  } catch (fatal) {
    console.error('[KD] 💥 Uncaught error in triggerGenerateHorses:', fatal);
  }
}

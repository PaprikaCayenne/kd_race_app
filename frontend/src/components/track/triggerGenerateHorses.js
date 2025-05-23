// File: frontend/src/components/track/triggerGenerateHorses.js
// Version: v2.3.2 — Fixes 400 error by adding startAtPercent to POST body, logs POST payload

import { generateHorsePaths } from '@/utils/generateHorsePaths';
import { setupHorses } from './setupHorses';
import { logInfo } from './debugConsole';
import parseColorToHex from '@/utils/parseColorToHex';

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

    const { laneCount, lanes, spriteWidth, centerline } = trackData;

    if (!Array.isArray(lanes) || lanes.length < laneCount) {
      console.error('[KD] ❌ Not enough valid lanes for horse generation');
      return;
    }

    // ✅ Fixed: include required startAtPercent
    const raceInitPayload = {
      startAtPercent: 0,
      width,
      height
    };

    console.log('[KD] 📨 POST /api/admin/start', raceInitPayload);

    try {
      await fetch('/api/admin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': '6a2e8819c6fb4c15'
        },
        body: JSON.stringify(raceInitPayload)
      });
    } catch (err) {
      console.error('[KD] ❌ Error triggering race:', err);
      return;
    }

    // 🐴 Fetch and filter horses
    let horses = [];
    try {
      const res = await fetch('/api/horses');
      const allHorses = await res.json();

      const usedSet = usedHorseIdsRef?.current || new Set();
      const unused = allHorses.filter(h => !usedSet.has(h.id));
      const selected = unused.slice(0, laneCount);

      horses = selected.map((h, index) => {
        const hex = parseColorToHex(h.color);
        const mapped = { ...h, localId: index, hex };
        logInfo(`[KD] 🎯 Assigning localId=${index} to horse id=${h.id}, name=${h.name}, hex=${hex.toString(16)}`);
        return mapped;
      });

      horsesRef.current = horses;
      if (usedHorseIdsRef?.current) {
        horses.forEach(h => usedHorseIdsRef.current.add(h.id));
      }

      horses.forEach(h =>
        logInfo(`[KD] 🐴 Selected Horse: ${h.name} | dbId=${h.id} | localId=${h.localId}`)
      );
    } catch (err) {
      console.error('[KD] ❌ Failed to fetch horses:', err);
      return;
    }

    if (!horses.length) {
      console.error('[KD] ❌ No horses available after filtering');
      return;
    }

    // 🧭 Generate vector-based lane paths
    const horsePaths = await generateHorsePaths({ horses, lanes, centerline, spriteWidth });

    if (!(horsePaths instanceof Map) || horsePaths.size === 0) {
      console.error('[KD] ❌ generateHorsePaths returned empty or invalid Map');
      return;
    }

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

// File: frontend/src/components/track/triggerGenerateHorses.js
// Version: v2.7.0 — Aligns generateHorsePaths call with latest arc-distance logic
// Date: 2025-05-30

import { generateHorsePaths } from '@/utils/generateHorsePaths';
import { setupHorses } from './setupHorses';
import { logInfo } from './debugConsole';
import parseColorToHex from '@/utils/parseColorToHex';
import { getSpriteDimensions } from '@/utils/spriteDimensionCache';
import { clearRaceVisuals } from './clearRaceVisuals';

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
  debugVisible,
  setRaceWarnings = () => {}
}) {
  logInfo('🟡 triggerGenerateHorses() — START');

  try {
    // 🧹 Step 1: Clear visuals from prior race
    clearRaceVisuals({
      app,
      horseSpritesRef,
      labelSpritesRef,
      finishedHorsesRef,
      debugDotsRef,
      debugPathLinesRef,
      startDotsRef,
      finishDotsRef
    });

    if (!trackData || typeof trackData !== 'object') {
      console.error('[KD] ❌ trackData is missing or invalid:', trackData);
      setRaceWarnings(prev => [...prev, 'Track data missing or invalid.']);
      return;
    }

    const { laneCount, lanes, centerline, spriteWidth, startLineOffset } = trackData;

    if (!Array.isArray(lanes) || lanes.length < laneCount) {
      console.error('[KD] ❌ Not enough valid lanes for horse generation');
      setRaceWarnings(prev => [...prev, 'Not enough valid lanes on track']);
      return;
    }

    const raceInitPayload = {
      startAtPercent: 0,
      width,
      height
    };

    logInfo('📨 POST /api/admin/start', raceInitPayload);

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
      console.error('[KD] ❌ Error calling /api/admin/start:', err);
      setRaceWarnings(prev => [...prev, 'Race start failed on backend']);
      return;
    }

    // 🐴 Fetch horses from backend
    let horses = [];
    try {
      const res = await fetch('/api/horses');
      const allHorses = await res.json();

      const usedSet = usedHorseIdsRef?.current || new Set();
      const unused = allHorses.filter(h => !usedSet.has(h.id));
      const selected = unused.slice(0, laneCount);

      horses = selected.map((h, index) => {
        const saddleHex = parseColorToHex(h.saddleHex || h.color || '#000');
        const bodyHex = parseColorToHex(h.bodyHex || '#999');
        return {
          ...h,
          localId: index,
          saddleHex,
          bodyHex
        };
      });

      horsesRef.current = horses;
      if (usedHorseIdsRef?.current) {
        horses.forEach(h => usedHorseIdsRef.current.add(h.id));
      }

      horses.forEach(h =>
        logInfo(`🐴 Horse: ${h.name} | id=${h.id} | localId=${h.localId} | saddle=${h.saddleHex} | body=${h.bodyHex}`)
      );
    } catch (err) {
      console.error('[KD] ❌ Failed to fetch horses:', err);
      setRaceWarnings(prev => [...prev, 'Failed to fetch horses from backend']);
      return;
    }

    if (!horses.length) {
      const msg = 'No horses available to place on track';
      console.error('[KD] ❌', msg);
      setRaceWarnings(prev => [...prev, msg]);
      return;
    }

    const sampleHorse = horses[0];
    const spriteDims = getSpriteDimensions(
      sampleHorse.saddleHex,
      sampleHorse.id,
      app,
      sampleHorse.variant || 'bay'
    );

    if (!spriteDims?.width || spriteDims.width <= 0) {
      const msg = `Invalid sprite dimensions (${spriteDims?.width})`;
      setRaceWarnings(prev => [...prev, msg]);
      console.error('[KD] ❌', msg);
      return;
    }

    const { horsePaths, warnings = [] } = await generateHorsePaths({
      horses,
      lanes,
      centerline,
      spriteWidth: spriteDims.width,
      startAtPercent: 0,
      startLinePadding: startLineOffset ?? 100
    });

    if (!(horsePaths instanceof Map) || horsePaths.size === 0) {
      const msg = 'generateHorsePaths returned empty or invalid Map';
      setRaceWarnings(prev => [...prev, msg]);
      console.error('[KD] ❌', msg);
      return;
    }

    if (warnings.length) {
      setRaceWarnings(prev => [...prev, ...warnings]);
    }

    horsePathsRef.current = horsePaths;

    logInfo(`✅ Generated horsePaths for ${horsePaths.size} horses`);
    setupHorses({
      app,
      horses,
      horsePathsRef,
      horseSpritesRef,
      labelSpritesRef,
      debugDotsRef,
      debugPathLinesRef,
      finishDotsRef,
      startDotsRef,
      finishedHorsesRef,
      setRaceWarnings,
      lanes,
      debugVisible
    });

    setRaceReady(true);
    setCanGenerate(false);
    logInfo('🟢 triggerGenerateHorses() — DONE');
  } catch (err) {
    console.error('[KD] ❌ Unhandled error in triggerGenerateHorses:', err);
    setRaceWarnings(prev => [...prev, 'Unexpected error generating horses']);
  }
}

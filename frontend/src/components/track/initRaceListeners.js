// File: frontend/src/components/track/initRaceListeners.js
// Version: v3.3.0 — Adds admin:clear-stage listener to wipe visuals when reset is pressed
// Date: 2025-05-30

import { setupHorses } from './setupHorses';
import { generateHorsePaths } from '@/utils/generateHorsePaths';
import { playRace } from '@/utils/playRace';
import { generateRacePacingPlan } from '@/utils/generateRacePacingPlan';
import { clearRaceVisuals } from './clearRaceVisuals';

const logInfo = (...args) => console.log('[KD]', ...args);
const logWarn = (...args) => console.warn('[KD] ⚠️', ...args);

export function initRaceListeners({
  socket,
  appRef,
  horseSpritesRef,
  labelSpritesRef,
  debugDotsRef,
  debugPathLinesRef,
  finishDotsRef,
  startDotsRef,
  trackDataRef,
  trackReadyRef,
  centerlineRef,
  horsePathsRef,
  horsesRef,
  finishedHorsesRef,
  usedHorseIdsRef,
  raceInfoRef,
  setRaceName,
  setRaceWarnings,
  debugVisible,
  raceDurationSeconds,
  setRaceCompleted,
  setLastFinishedRaceId,
  setLiveRanking
}) {
  socket.on('race:init', async ({ raceId, raceName, horses, startAtPercent }) => {
    const app = appRef.current;
    const warnings = [];

    setRaceCompleted?.(false);
    setLiveRanking?.([]);

    if (!trackReadyRef?.current) {
      const msg = '[KD] ❌ race:init received before track was ready';
      console.warn(msg);
      socket.emit('race:setup-failed', { raceId, reason: msg });
      setRaceWarnings?.([msg]);
      return;
    }

    if (!Array.isArray(horses) || horses.length === 0) {
      const msg = 'race:init received no horses — aborting setup';
      logWarn(msg);
      setRaceWarnings?.([msg]);
      return;
    }

    const centerline = centerlineRef.current;
    if (!centerline || typeof centerline !== 'object' || !Array.isArray(centerline.path) || centerline.path.length < 2) {
      const msg = 'Missing or invalid centerline; cannot generate paths.';
      logWarn(msg);
      setRaceWarnings?.([msg]);
      return;
    }

    // 🧹 Clear visuals from the last race
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

    const horsePathMap = new Map();
    try {
      const horsePaths = await generateHorsePaths({
        centerline,
        horses,
        startAtPercent,
        lanes: trackDataRef?.current?.lanes,
        spriteWidth: trackDataRef?.current?.spriteWidth,
        startLinePadding: trackDataRef?.current?.startLineOffset ?? 100
      });

      for (const horse of horses) {
        const path = horsePaths.get(horse.localId);
        if (!path?.getPointAtDistance) {
          const msg = `Missing path for horse localId ${horse.localId} (${horse.name})`;
          warnings.push(msg);
          logWarn(msg);
          continue;
        }
        horsePathMap.set(horse.localId, path);
      }

      horsePathsRef.current = horsePathMap;
    } catch (err) {
      const msg = `Path generation failed: ${err.message}`;
      logWarn(msg);
      setRaceWarnings?.([msg]);
      socket.emit('race:setup-failed', { raceId, reason: msg });
      return;
    }

    generateRacePacingPlan(horses, horsePathsRef.current, raceDurationSeconds);
    setRaceWarnings?.(warnings);

    if (app?.__raceTicker) {
      if (debugVisible) logInfo('🔁 Clearing old ticker before loading new horses');
      app.ticker.remove(app.__raceTicker);
      app.__raceTicker = null;
    }

    try {
      logInfo(`[KD] 🐴 Placing ${horses.length} horses`);
      setupHorses({
        app,
        horses,
        debugVisible,
        horseSpritesRef,
        labelSpritesRef,
        debugDotsRef,
        debugPathLinesRef,
        finishDotsRef,
        startDotsRef,
        horsePathsRef,
        horsesRef,
        finishedHorsesRef,
        setRaceWarnings,
        lanes: trackDataRef?.current?.lanes
      });
    } catch (err) {
      const msg = `setupHorses crashed: ${err.message}`;
      console.error('[KD] ❌', msg);
      setRaceWarnings?.([msg]);
      socket.emit('race:setup-failed', { raceId, reason: msg });
      return;
    }

    const horseIdsPlaced = [...horseSpritesRef.current?.keys() || []];
    if (horseIdsPlaced.length === 0) {
      const msg = `No horses were placed — all failed during setup`;
      logWarn(`❌ ${msg}`);
      setRaceWarnings?.(prev => [...prev, msg]);
      socket.emit('race:setup-failed', { raceId, reason: msg });
    }

    horsesRef.current = horses;
    usedHorseIdsRef?.current?.add?.(...horses.map(h => h.id));
    if (raceInfoRef) raceInfoRef.current = { raceId };
    if (setRaceName) setRaceName(raceName || `Race ${raceId}`);

    logInfo(`🎬 Race initialized (ID: ${raceId}) with ${horses.length} horses`);
  });

  const startHandlers = ['race:start', 'admin:start-race'];
  startHandlers.forEach(event => {
    socket.on(event, ({ raceId }) => {
      const horses = horsesRef.current;
      if (!horses || horses.length === 0) {
        logWarn(`[KD] ❌ Cannot start race — horsesRef.current is empty`);
        return;
      }

      horses.forEach(h => {
        const path = horsePathsRef.current?.get(h.localId);
        logInfo(`[KD] Path for horse ${h.name} (localId=${h.localId}) →`, path);
        if (typeof path?.getPointAtDistance !== 'function') {
          logWarn(`[KD] ⚠️ Missing getPointAtDistance for horse ${h.name} (localId=${h.localId})`);
        }
      });

      const startLine = trackDataRef?.current?.startLine;
      if (startLine && typeof startLine.alpha === 'number') {
        appRef.current.ticker.add(() => {
          if (startLine.alpha > 0) {
            startLine.alpha -= 0.03;
            if (startLine.alpha < 0) startLine.alpha = 0;
          }
        });
      }

      const finishLine = trackDataRef?.current?.finishLine;
      if (finishLine) {
        finishLine.alpha = 0;
        setTimeout(() => {
          appRef.current.ticker.add(() => {
            if (finishLine.alpha < 1) {
              finishLine.alpha += 0.02;
              if (finishLine.alpha > 1) finishLine.alpha = 1;
            }
          });
        }, 5000);
      }

      playRace({
        app: appRef.current,
        socket,
        horseSprites: horseSpritesRef.current,
        horsePaths: horsePathsRef.current,
        labelSprites: labelSpritesRef.current,
        horses,
        debugVisible,
        raceId,
        raceDurationSeconds,
        setLiveRanking,
        onRaceEnd: (results) => {
          logInfo('[KD] 🏁 Race ended! Final results sent to backend.');
          logInfo(results);

          if (setRaceCompleted) setRaceCompleted(true);
          if (setLastFinishedRaceId && raceInfoRef?.current?.raceId) {
            setLastFinishedRaceId(raceInfoRef.current.raceId);
          }
        }
      });
    });
  });

  // ✅ Clear visuals on manual reset
  socket.on('admin:clear-stage', () => {
    logInfo('[KD] 🧹 admin:clear-stage → clearing all visuals');
    clearRaceVisuals({
      app: appRef.current,
      horseSpritesRef,
      labelSpritesRef,
      finishedHorsesRef,
      debugDotsRef,
      debugPathLinesRef,
      startDotsRef,
      finishDotsRef
    });
  });
}

// File: frontend/src/components/track/initRaceListeners.js
// Version: v3.5.0 — Adds pre-race walk-in from pens on open-bets and first-finish winner trigger
// Date: 2026-02-18

import { setupHorses } from './setupHorses';
import { generateHorsePaths } from '@/utils/generateHorsePaths';
import { playRace } from '@/utils/playRace';
import { generateRacePacingPlan } from '@/utils/generateRacePacingPlan';
import { clearRaceVisuals } from './clearRaceVisuals';

const logInfo = (...args) => console.log('[KD]', ...args);
const logWarn = (...args) => console.warn('[KD] ⚠️', ...args);

function animateWalkIn({ app, horses, horseSpritesRef, labelSpritesRef, durationMs = 1800 }) {
  const start = performance.now();
  const finalByLocalId = new Map();

  horses.forEach((horse) => {
    const sprite = horseSpritesRef.current.get(horse.localId);
    const label = labelSpritesRef.current.get(horse.localId);
    const pose = sprite?.__raceStartPose;
    if (!sprite || !pose) return;

    finalByLocalId.set(horse.localId, {
      fromX: sprite.x,
      fromY: sprite.y,
      fromRot: sprite.rotation || 0,
      toX: pose.x,
      toY: pose.y,
      toRot: pose.rotation || 0,
      label
    });
  });

  if (finalByLocalId.size === 0) return;

  const ticker = () => {
    const now = performance.now();
    const t = Math.max(0, Math.min(1, (now - start) / durationMs));
    const eased = 1 - Math.pow(1 - t, 3);

    finalByLocalId.forEach((pose, localId) => {
      const sprite = horseSpritesRef.current.get(localId);
      if (!sprite) return;
      sprite.x = pose.fromX + (pose.toX - pose.fromX) * eased;
      sprite.y = pose.fromY + (pose.toY - pose.fromY) * eased;
      sprite.rotation = pose.fromRot + (pose.toRot - pose.fromRot) * eased;

      if (pose.label) {
        pose.label.x = sprite.x;
        pose.label.y = sprite.y - 20;
      }
    });

    if (t >= 1) {
      app.ticker.remove(ticker);
    }
  };

  app.ticker.add(ticker);
}

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
  setLiveRanking,
  setWinner
}) {
  socket.on('race:init', async ({ raceId, raceName, horses, startAtPercent }) => {
    const app = appRef.current;
    const warnings = [];

    setRaceCompleted?.(false);
    setLiveRanking?.([]);
    setWinner?.(null);

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

    generateRacePacingPlan(horses, horsePathsRef.current, raceDurationSeconds, `race-${raceId}`);
    setRaceWarnings?.(warnings);

    if (app?.__raceTicker) {
      if (debugVisible) logInfo('🔁 Clearing old ticker before loading new horses');
      app.ticker.remove(app.__raceTicker);
      app.__raceTicker = null;
    }

    try {
      const isFinalRace = /final/i.test(String(raceName || ''));
      const stagingArea = isFinalRace
        ? trackDataRef?.current?.winnersPenBounds
        : trackDataRef?.current?.penBounds;

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
        lanes: trackDataRef?.current?.lanes,
        stagingArea,
        placeInStaging: true
      });
    } catch (err) {
      const msg = `setupHorses crashed: ${err.message}`;
      console.error('[KD] ❌', msg);
      setRaceWarnings?.([msg]);
      socket.emit('race:setup-failed', { raceId, reason: msg });
      return;
    }

    const horseIdsPlaced = [...(horseSpritesRef.current?.keys() || [])];
    if (horseIdsPlaced.length === 0) {
      const msg = 'No horses were placed — all failed during setup';
      logWarn(`❌ ${msg}`);
      setRaceWarnings?.((prev) => [...prev, msg]);
      socket.emit('race:setup-failed', { raceId, reason: msg });
    }

    horsesRef.current = horses;
    usedHorseIdsRef?.current?.add?.(...horses.map((h) => h.id));
    if (raceInfoRef) raceInfoRef.current = { raceId };
    if (setRaceName) setRaceName(raceName || `Race ${raceId}`);

    logInfo(`🎬 Race initialized (ID: ${raceId}) with ${horses.length} horses`);
  });

  const startHandlers = ['race:start', 'admin:start-race'];
  startHandlers.forEach((event) => {
    socket.on(event, ({ raceId }) => {
      const horses = horsesRef.current;
      if (!horses || horses.length === 0) {
        logWarn('[KD] ❌ Cannot start race — horsesRef.current is empty');
        return;
      }

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

  socket.on('admin:open-bets', () => {
    const app = appRef.current;
    const horses = horsesRef.current || [];
    if (!app || horses.length === 0) return;
    animateWalkIn({ app, horses, horseSpritesRef, labelSpritesRef, durationMs: 2200 });
  });

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

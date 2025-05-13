// File: frontend/src/components/track/initRaceListeners.js
// Version: v1.1.1 — Sets horsesRef correctly to enable race start

import { inflate } from 'pako';
import { setupHorses } from './setupHorses';
import { logInfo } from './debugConsole';

export function initRaceListeners(options) {
  const {
    socket,
    appRef,
    horseSpritesRef,
    labelSpritesRef,
    debugDotsRef,
    debugPathLinesRef,
    finishDotsRef,
    startDotsRef,
    trackDataRef,
    horsePathsRef,
    horsesRef,
    finishedHorsesRef,
    usedHorseIdsRef,
    setRaceReady,
    setCanGenerate,
    debugVisible
  } = options;

  socket.on('race:init', (data) => {
    const inflated = inflate(new Uint8Array(data), { to: 'string' });
    const payload = JSON.parse(inflated);

    const app = appRef.current;
    if (app.__raceTicker) {
      logInfo('[KD] 🔁 Clearing old ticker before loading new horses');
      app.ticker.remove(app.__raceTicker);
      app.__raceTicker = null;
    }

    setupHorses({
      app,
      horses: payload.horses,
      debugVisible,
      horseSpritesRef,
      labelSpritesRef,
      debugDotsRef,
      debugPathLinesRef,
      finishDotsRef,
      startDotsRef,
      horsePathsRef,
      horsesRef,
      finishedHorsesRef
    });

    horsesRef.current = payload.horses; // ✅ Needed for triggerStartRace to work

    setRaceReady(true);
    setCanGenerate(false);
  });
}

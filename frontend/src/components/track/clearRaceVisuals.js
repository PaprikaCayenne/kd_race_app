// File: frontend/src/components/track/clearRaceVisuals.js
// Version: v1.0.0 — Clears horse sprites, labels, and debug visuals from the stage
// Date: 2025-05-29

export function clearRaceVisuals({
  app,
  horseSpritesRef,
  labelSpritesRef,
  finishedHorsesRef,
  debugDotsRef,
  debugPathLinesRef,
  startDotsRef,
  finishDotsRef
}) {
  const log = (...args) => console.log('[KD] 🧹', ...args);

  const allRefs = [
    horseSpritesRef,
    labelSpritesRef,
    finishedHorsesRef,
    debugDotsRef,
    debugPathLinesRef,
    startDotsRef,
    finishDotsRef
  ];

  allRefs.forEach((ref) => {
    if (ref?.current) {
      ref.current.forEach((obj) => {
        if (obj?.destroy) obj.destroy();
        if (app?.stage?.children?.includes(obj)) app.stage.removeChild(obj);
      });
      ref.current = [];
    }
  });

  log('Cleared all race visuals');
}

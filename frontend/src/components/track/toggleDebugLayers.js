// File: frontend/src/components/track/toggleDebugLayers.js
// Version: v1.0.1 — Fixes destructuring bug

export function toggleDebugLayers({
  app,
  debugVisible,
  debugDotsRef,
  debugPathLinesRef,
  startDotsRef,
  finishDotsRef,
  labelSpritesRef
}) {
  const toggle = (items, visible) => {
    items.forEach(item => {
      if (visible && !app.stage.children.includes(item)) app.stage.addChild(item);
      else if (!visible && app.stage.children.includes(item)) app.stage.removeChild(item);
    });
  };

  toggle(debugDotsRef.current, debugVisible);
  toggle(debugPathLinesRef.current, debugVisible);
  toggle(startDotsRef.current, debugVisible);
  toggle(finishDotsRef.current, debugVisible);

  labelSpritesRef.current.forEach(label => {
    if (debugVisible && !app.stage.children.includes(label)) app.stage.addChild(label);
    else if (!debugVisible && app.stage.children.includes(label)) app.stage.removeChild(label);
  });
}

// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.6.5 — Diagnostic only: crash guard and entry check

export function generateHorsePaths({
  horses,
  lanes,
  centerline,
  startAtPercent = 0,
  spriteWidth = 20
}) {
  console.warn('[KD] 🧪 ENTERED generateHorsePaths');

  // 🛑 TEMP GUARD: prevent crash while we confirm load and inputs
  console.log('[KD] 🧪 Input horses:', horses);
  console.log('[KD] 🧪 Input lanes:', lanes);
  console.log('[KD] 🧪 Input centerline:', centerline);

  if (!Array.isArray(horses)) {
    console.error('[KD] ❌ horses is not an array');
    return {};
  }

  if (!Array.isArray(lanes)) {
    console.error('[KD] ❌ lanes is not an array');
    return {};
  }

  if (!Array.isArray(centerline)) {
    console.error('[KD] ❌ centerline is not an array');
    return {};
  }

  const anyInvalidLanes = lanes.some((l, idx) => {
    if (!Array.isArray(l)) {
      console.error(`[KD] ❌ Lane ${idx} is not an array:`, l);
      return true;
    }
    return false;
  });

  if (anyInvalidLanes) {
    console.error('[KD] ❌ Invalid lanes detected, aborting horse path generation');
    return {};
  }

  if (lanes.length < horses.length) {
    console.warn(`[KD] ⚠️ Not enough lanes for all horses`);
  }

  // ✅ TEMP: return early to prove safe execution
  console.log('[KD] ✅ generateHorsePaths loaded safely — returning empty result temporarily');
  return {};
}

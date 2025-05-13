// File: frontend/src/components/track/triggerGenerateHorses.js
// Version: v1.0.1 — Updated to use destructured options object

export async function triggerGenerateHorses({
  width,
  height,
  startAtPercent,
  setRaceReady,
  setCanGenerate
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
  }
}

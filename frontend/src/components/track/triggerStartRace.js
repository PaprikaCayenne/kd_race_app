// File: frontend/src/components/track/triggerStartRace.js
// Version: v2.0.0 — Emits admin:start-race with paths, not playRace()
// Date: 2025-05-28

export function triggerStartRace({
  socket,
  raceInfoRef,
  horsesRef,
  horsePathsRef
}) {
  const raceId = raceInfoRef.current?.raceId;
  const horses = horsesRef.current;
  const horsePaths = horsePathsRef.current;

  if (!raceId || !horses || !horsePaths) {
    console.warn('[KD] ❌ Missing raceId, horses, or horsePaths — cannot emit admin:start-race');
    return;
  }

  // Convert Map to plain object
  const plainHorsePaths = {};
  for (const [horseId, pathData] of horsePaths.entries()) {
    if (typeof horseId !== 'string') continue;
    const { arcLength, trueFinish } = pathData;
    plainHorsePaths[horseId] = {
      arcLength,
      trueFinish,
      getPointAtDistance: pathData.getPointAtDistance // function remains intact
    };
  }

  console.log('[KD] 🚀 Emitting admin:start-race with horsePaths for race', raceId);
  socket.emit('admin:start-race', {
    raceId,
    horses,
    horsePaths: plainHorsePaths
  });
}

// File: frontend/src/utils/generateHorsePaths.js
// Version: v3.1.0 — Finalizes arc 0 alignment, cleans up edge cases, confirms accurate wraparound

export async function generateHorsePaths({
  horses,
  lanes,
  centerline,
  spriteWidth = 0
}) {
  if (!Array.isArray(horses) || !horses.length) return new Map();
  if (!Array.isArray(lanes) || !lanes.length) return new Map();
  if (!centerline?.getPointAtDistance || typeof centerline.totalArcLength !== 'number') {
    console.error('[KD] ❌ Invalid centerline passed to generateHorsePaths');
    return new Map();
  }

  const horsePaths = new Map();

  horses.forEach((horse, i) => {
    const lane = lanes[i];
    if (!lane || lane.length < 2) {
      console.warn(`[KD] ⚠️ Horse "${horse.name}" skipped — invalid lane path`);
      return;
    }

    // 🧮 Calculate arc length per segment
    const arcPoints = [];
    let arcLength = 0;

    for (let j = 0; j < lane.length; j++) {
      const curr = lane[j];
      const prev = lane[j - 1] || lane[lane.length - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      arcLength += segLen;
      arcPoints.push({ ...curr, arcLength });
    }

    const startDistance = 0;

    const getPointAtDistance = (distance) => {
      const d = distance % arcLength;
      let dist = 0;

      for (let k = 0; k < arcPoints.length - 1; k++) {
        const p0 = arcPoints[k];
        const p1 = arcPoints[k + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (dist + segLen >= d) {
          const t = (d - dist) / segLen;
          const x = p0.x + dx * t;
          const y = p0.y + dy * t;
          const rotation = Math.atan2(dy, dx);
          return { x, y, rotation };
        }

        dist += segLen;
      }

      const last = arcPoints.at(-1);
      const preLast = arcPoints.at(-2) || last;
      return {
        x: last.x,
        y: last.y,
        rotation: Math.atan2(last.y - preLast.y, last.x - preLast.x)
      };
    };

    horsePaths.set(horse.id, {
      path: lane,
      arcPoints,
      laneIndex: i,
      pathLength: arcLength,
      getPointAtDistance,
      getCurveFactorAt: () => 1.0,
      startDistance
    });

    console.log(`[KD] 🐎 Horse ${horse.name} (dbId=${horse.id}) → startDistance=0 / arcLength=${arcLength.toFixed(2)}px`);
  });

  return horsePaths;
}

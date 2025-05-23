// File: frontend/src/utils/generateHorsePaths.js
// Version: v3.5.1 — Corrects drift vector logic for all lanes using arc projection
// Date: 2025-05-22

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

  const DRIFT_LENGTH = 350;
  const horsePaths = new Map();

  horses.forEach((horse, i) => {
    let lane = lanes[i];
    if (!lane || lane.length < 2) {
      console.warn(`[KD] ⚠️ Horse "${horse.name}" skipped - invalid lane path`);
      return;
    }

    const isClosed = lane[0].x === lane.at(-1).x && lane[0].y === lane.at(-1).y;
    if (!isClosed) lane = [...lane, lane[0]];

    const arcPoints = [];
    let arcLength = 0;

    for (let j = 0; j < lane.length; j++) {
      const curr = lane[j];
      const prev = lane[j - 1] || lane[lane.length - 2];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      arcLength += segLen;
      arcPoints.push({ ...curr, arcLength });
    }

    const getPointAtDistance = (distance) => {
      const d = Math.min(distance, arcLength + DRIFT_LENGTH);
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

      // Project past arcLength using final segment direction
      const pLast = arcPoints.at(-2);
      const pEnd = arcPoints.at(-1);
      const dx = pEnd.x - pLast.x;
      const dy = pEnd.y - pLast.y;
      const remaining = d - arcLength;
      const norm = Math.sqrt(dx * dx + dy * dy) || 1;

      const x = pEnd.x + (dx / norm) * remaining;
      const y = pEnd.y + (dy / norm) * remaining;
      const rotation = Math.atan2(dy, dx);

      return { x, y, rotation };
    };

    const trueFinishDistance = arcLength;
    const driftDistance = arcLength + DRIFT_LENGTH;

    const trueFinish = getPointAtDistance(trueFinishDistance);
    trueFinish.arcLength = trueFinishDistance;

    const driftEnd = getPointAtDistance(driftDistance);
    driftEnd.arcLength = driftDistance;

    horsePaths.set(horse.id, {
      path: lane,
      arcPoints,
      arcLength,
      laneIndex: i,
      driftLength: DRIFT_LENGTH,
      driftEnd,
      trueFinish,
      getPointAtDistance,
      getCurveFactorAt: () => 1.0,
      startDistance: 0
    });

    console.log(`[KD] 🎯 ${horse.name} true finish = ${trueFinishDistance.toFixed(2)} px @ (${trueFinish.x.toFixed(1)}, ${trueFinish.y.toFixed(1)})`);
    console.log(`[KD] 🔴 ${horse.name} drift end = ${driftDistance.toFixed(2)} px @ (${driftEnd.x.toFixed(1)}, ${driftEnd.y.toFixed(1)})`);
  });

  return horsePaths;
}

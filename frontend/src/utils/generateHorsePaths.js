// File: frontend/src/utils/generateHorsePaths.js
// Version: v2.8.0 — Uses unrotated arcPoints and direct arc-distance projection

/**
 * Builds normalized path data for each horse based on vector lane geometry and a shared arc-distance anchor.
 */
export async function generateHorsePaths({
  horses,
  lanes,
  centerline,
  startAtPercent = 0,
  spriteWidth = 0
}) {
  if (!Array.isArray(horses) || !horses.length) return new Map();
  if (!Array.isArray(lanes) || !lanes.length) return new Map();
  if (!centerline || typeof centerline.totalArcLength !== 'number' || typeof centerline.getPointAtDistance !== 'function') {
    console.error('[KD] ❌ Invalid centerline passed to generateHorsePaths');
    return new Map();
  }

  const horsePaths = new Map();
  const centerlineAnchor = centerline.getPointAtDistance(centerline.totalArcLength * startAtPercent);

  console.log(`[KD] 🎯 Centerline anchor at ${startAtPercent * 100}% → (${centerlineAnchor.x.toFixed(1)}, ${centerlineAnchor.y.toFixed(1)})`);

  horses.forEach((horse, i) => {
    const lane = lanes[i];
    if (!lane || lane.length < 2) {
      console.warn(`[KD] ❌ Horse "${horse.name}" skipped — invalid or empty lane`);
      return;
    }

    const arcPoints = [];
    let arcLength = 0;
    let minDist = Infinity;
    let closestIndex = 0;

    for (let j = 0; j < lane.length; j++) {
      const curr = lane[j];
      const prev = lane[j - 1] || lane[lane.length - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      arcLength += segLen;

      const distToAnchor = Math.hypot(curr.x - centerlineAnchor.x, curr.y - centerlineAnchor.y);
      if (distToAnchor < minDist) {
        minDist = distToAnchor;
        closestIndex = j;
      }

      arcPoints.push({ ...curr, arcLength });
    }

    const startDistance = arcPoints[closestIndex]?.arcLength ?? 0;

    const getPointAtDistance = (d) => {
      const wrapped = d % arcLength;
      let dist = 0;

      for (let k = 0; k < arcPoints.length - 1; k++) {
        const p0 = arcPoints[k];
        const p1 = arcPoints[k + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (dist + segLen >= wrapped) {
          const t = (wrapped - dist) / segLen;
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

    console.log(`[KD] 🧪 Horse ${horse.name} (dbId=${horse.id}) → startDistance=${startDistance.toFixed(2)} / arcLength=${arcLength.toFixed(2)} / closestIndex=${closestIndex}`);
    if (minDist > 20) {
      console.warn(`[KD] ⚠️ WARN: ${horse.name} (lane ${i}) is ${minDist.toFixed(1)}px off from centerline anchor`);
    }
  });

  return horsePaths;
}

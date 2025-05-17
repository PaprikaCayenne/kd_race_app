// File: frontend/src/utils/generateHorsePaths.js
// Version: v2.5.1 — Logs closestIndex and minDist to validate path anchor rotation

/**
 * Builds normalized path data for each horse based on vector lane geometry and a global arc-distance anchor.
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

  // 🎯 Global anchor position (e.g. 10% around centerline)
  const globalStart = centerline.getPointAtDistance(centerline.totalArcLength * startAtPercent);

  horses.forEach((horse, i) => {
    const lane = lanes[i];
    if (!lane || lane.length < 2) return;

    const arcPoints = [];
    let arcLength = 0;
    let minDist = Infinity;
    let closestIndex = 0;

    // 🧮 Build arcLength and find closest point to global anchor
    for (let j = 0; j < lane.length; j++) {
      const curr = lane[j];
      const prev = lane[j - 1] || lane[lane.length - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      arcLength += segLen;

      arcPoints.push({ ...curr, arcLength });

      const distToAnchor = Math.hypot(curr.x - globalStart.x, curr.y - globalStart.y);
      if (distToAnchor < minDist) {
        minDist = distToAnchor;
        closestIndex = j;
      }
    }

    const startDistance = arcPoints[closestIndex].arcLength;

    // 🔄 Rotate path
    const rotatedPath = [...lane.slice(closestIndex), ...lane.slice(0, closestIndex)];

    const getPointAtDistance = (d) => {
      const wrapped = d % arcLength;
      let dist = 0;

      for (let k = 0; k < rotatedPath.length - 1; k++) {
        const p0 = rotatedPath[k];
        const p1 = rotatedPath[k + 1];
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

      const last = rotatedPath[rotatedPath.length - 1];
      const preLast = rotatedPath[rotatedPath.length - 2];
      return {
        x: last.x,
        y: last.y,
        rotation: Math.atan2(last.y - preLast.y, last.x - preLast.x)
      };
    };

    horsePaths.set(horse.id, {
      path: lane,
      rotatedPath,
      laneIndex: i,
      pathLength: arcLength,
      getPointAtDistance,
      getCurveFactorAt: () => 1.0,
      startDistance
    });

    console.log(`[KD] 🧪 Horse ${horse.name} (dbId=${horse.id}) → startDistance=${startDistance.toFixed(2)} / arcLength=${arcLength.toFixed(2)}`);
    console.log(`[KD] 🧪 ${horse.name} → closestIndex=${closestIndex} | minDist=${minDist.toFixed(2)} | lanePts=${lane.length}`);
  });

  return horsePaths;
}

// File: frontend/src/utils/generateHorsePaths.js
// Version: v2.2.0 — Uses true arc-distance startAtPercent offset from lane path

/**
 * Builds normalized path data for each horse based on vector lane geometry and arc-distance.
 * Rotates paths so each starts at the same arc-length percent (e.g. 0.03 for top-middle).
 */
export async function generateHorsePaths({ horses, lanes, centerline, startAtPercent = 0 }) {
  if (!Array.isArray(horses) || !horses.length) return new Map();
  if (!Array.isArray(lanes) || !lanes.length) return new Map();
  if (!Array.isArray(centerline) || !centerline.length) return new Map();

  const horsePaths = new Map();

  horses.forEach((horse, i) => {
    const lane = lanes[i];
    if (!lane || lane.length < 2) return;

    // Step 1: Compute total arc-length of this lane
    const arcPoints = [];
    let arcLength = 0;

    for (let j = 0; j < lane.length; j++) {
      const curr = lane[j];
      const prev = lane[j - 1] || lane[lane.length - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segment = Math.sqrt(dx * dx + dy * dy);
      arcLength += segment;
      arcPoints.push({ ...curr, arcLength });
    }

    // Step 2: Determine the true distance offset
    const startOffset = arcLength * startAtPercent;

    // Step 3: Find index and rotate path to start at that offset
    let rotateIndex = 0;
    for (let j = 0; j < arcPoints.length; j++) {
      if (arcPoints[j].arcLength >= startOffset) {
        rotateIndex = j;
        break;
      }
    }

    const rotatedPath = [...lane.slice(rotateIndex), ...lane.slice(0, rotateIndex)];

    // Step 4: Provide smooth arc-distance-based point lookup
    const getPointAtDistance = (d) => {
      const wrapped = d % arcLength;
      let currLength = 0;

      for (let k = 0; k < rotatedPath.length - 1; k++) {
        const p0 = rotatedPath[k];
        const p1 = rotatedPath[k + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (currLength + segLen >= wrapped) {
          const t = (wrapped - currLength) / segLen;
          const x = p0.x + dx * t;
          const y = p0.y + dy * t;
          const rotation = Math.atan2(dy, dx);
          return { x, y, rotation };
        }

        currLength += segLen;
      }

      // fallback to last point
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
      getCurveFactorAt: () => 1.0
    });
  });

  return horsePaths;
}

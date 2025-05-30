// File: frontend/src/utils/generateHorsePaths.js
// Version: v4.1.0 — Removes drift logic, caps path distance at arcLength
// Date: 2025-05-29

import { getTangentAngle } from '@/utils/arcUtils';

export function generateHorsePaths({
  horses,
  lanes,
  centerline,
  spriteWidth = 0,
  startLinePadding = 10
}) {
  const log = (...args) => console.log('[KD] 📍', ...args);
  const warn = (...args) => console.warn('[KD] ⚠️', ...args);

  const horsePaths = new Map();

  if (!Array.isArray(horses) || !horses.length) {
    warn('generateHorsePaths: No horses received');
    return horsePaths;
  }

  if (!Array.isArray(lanes) || !lanes.length) {
    warn('generateHorsePaths: No lanes received');
    return horsePaths;
  }

  horses.forEach((horse, i) => {
    const lane = lanes[i];
    log(`Horse ${horse?.name} (ID: ${horse?.id}, localId: ${horse?.localId}) → Lane ${i} points:`, lane?.length ?? 0);

    if (!lane || lane.length < 2) {
      warn(`Lane ${i} is invalid or missing for horse: ${horse?.name ?? horse?.id ?? 'unknown'}`);
      return;
    }

    const isClosed = lane[0].x === lane.at(-1).x && lane[0].y === lane.at(-1).y;
    const fullLane = isClosed ? lane : [...lane, lane[0]];

    const arcPoints = [];
    let arcLength = 0;

    for (let j = 0; j < fullLane.length; j++) {
      const curr = fullLane[j];
      const prev = fullLane[j - 1] || fullLane[fullLane.length - 2];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      arcLength += segLen;
      arcPoints.push({ ...curr, arcLength });
    }

    log(`Horse ${horse.name} (localId: ${horse.localId}) → Arc length: ${arcLength.toFixed(2)}px`);

    const getPointAtDistance = (distance) => {
      const d = Math.min(distance, arcLength);
      let dist = 0;

      for (let k = 0; k < arcPoints.length - 1; k++) {
        const p0 = arcPoints[k];
        const p1 = arcPoints[k + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (dist + segLen >= d) {
          const t = (d - dist) / segLen;
          return {
            x: p0.x + dx * t,
            y: p0.y + dy * t,
            rotation: Math.atan2(dy, dx)
          };
        }

        dist += segLen;
      }

      const angle = getTangentAngle(fullLane, arcLength - 1);
      const last = arcPoints.at(-1);
      return {
        x: last.x,
        y: last.y,
        rotation: angle
      };
    };

    const trueFinishDistance = arcLength;
    const startDistance = 0;

    const trueFinish = getPointAtDistance(trueFinishDistance);
    trueFinish.arcLength = trueFinishDistance;

    horsePaths.set(horse.localId, {
      path: fullLane,
      arcPoints,
      arcLength,
      laneIndex: i,
      trueFinish,
      getPointAtDistance,
      getCurveFactorAt: () => 1.0,
      startDistance
    });
  });

  log(`✅ Final horsePaths keys:`, [...horsePaths.keys()]);

  return horsePaths;
}

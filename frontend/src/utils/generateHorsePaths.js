// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.3.1 — Returns full path and defers placement to setupHorses.js

import { generateOffsetLanes } from './generateOffsetLanes';

export function generateHorsePaths({ horses, startAtPercent = 0.55, width = 1000, height = 600, laneWidth = 30, laneCount = 4, cornerRadius = 200, spriteWidth = 40 }) {
  const { lanes } = generateOffsetLanes({
    width,
    height,
    cornerRadius,
    laneWidth,
    laneCount,
    offsetX: 0,
    offsetY: 0
  });

  // Sort lanes from inner (closest to center) to outer
  const sortedLanes = [...lanes].sort((a, b) => {
    const dxA = a[0].x - width / 2;
    const dyA = a[0].y - height / 2;
    const dxB = b[0].x - width / 2;
    const dyB = b[0].y - height / 2;
    return (dxA ** 2 + dyA ** 2) - (dxB ** 2 + dyB ** 2);
  });

  const horsePaths = {};

  horses.forEach((horse, i) => {
    const laneIndex = i % sortedLanes.length;
    const path = sortedLanes[laneIndex];

    if (!path || path.length === 0) {
      console.warn('[KD] ⚠️ Skipping horse', horse.id, 'due to missing lane path');
      return;
    }

    horsePaths[horse.id] = {
      path,
      laneIndex,
    };
  });

  return horsePaths;
}

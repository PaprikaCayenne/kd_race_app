// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.3.9 — Applies sprite width offset to align horse nose with progress=0

/**
 * Generate full-length paths per horse based on lane geometry.
 * First horse gets innermost lane (lane 0), next horses move outward.
 */
export function generateHorsePaths({
  horses,
  lanes,
  spriteWidth = 20 // dynamically passed in
}) {
  const horsePaths = {};

  if (lanes.length < horses.length) {
    console.warn(`[KD] ⚠️ Not enough lanes for all horses`);
  }

  horses.forEach((horse, i) => {
    const laneIndex = i % lanes.length;
    const path = lanes[laneIndex];

    if (!path || path.length < 2) {
      console.warn(`[KD] ⚠️ Skipping horse ${horse.id} — invalid lane ${laneIndex}`);
      return;
    }

    // Offset the path start so that progress=0 places the sprite correctly
    const offsetDistance = spriteWidth * 0.5;
    const p0 = path[0];
    const p1 = path[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    const adjustedStart = {
      x: p0.x - dirX * offsetDistance,
      y: p0.y - dirY * offsetDistance
    };

    const adjustedPath = [adjustedStart, ...path];

    horsePaths[horse.id] = {
      path: adjustedPath,
      laneIndex
    };

    console.log(`[KD] 🐴 Assigned horse ${horse.id} → lane ${laneIndex} (inner to outer)`);
  });

  return horsePaths;
}

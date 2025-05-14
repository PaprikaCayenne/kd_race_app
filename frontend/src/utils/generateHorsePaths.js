// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.3.7 — Uses lanes from trackData to align with visual track boundaries

/**
 * Generate full-length visible paths per horse using passed-in lanes.
 * All paths align with pre-rendered track geometry.
 */
export function generateHorsePaths({
  horses,
  lanes,
  spriteWidth = 40
}) {
  const horsePaths = {};

  horses.forEach((horse, i) => {
    const laneIndex = i % lanes.length;
    const path = lanes[laneIndex];
    if (!path || path.length < 2) return;

    // Offset start slightly backward to center the sprite
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
  });

  return horsePaths;
}

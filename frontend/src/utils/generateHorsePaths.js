// File: frontend/src/utils/generateHorsePaths.js
// Version: v1.6.2 — Adds null checks for lanes and fallback paths to prevent hard crash

export function generateHorsePaths({
  horses,
  lanes,
  centerline,
  startAtPercent = 0,
  spriteWidth = 20
}) {
  const horsePaths = {};

  if (!Array.isArray(horses) || !Array.isArray(lanes) || !Array.isArray(centerline)) {
    console.error('[KD] ❌ Invalid input arrays in generateHorsePaths');
    return horsePaths;
  }

  if (lanes.length < horses.length) {
    console.warn(`[KD] ⚠️ Not enough lanes for all horses`);
  }

  const centerlineInfo = samplePathAtPercent(centerline, startAtPercent);
  const origin = centerlineInfo.point;
  const tangent = centerlineInfo.tangent;
  const normal = { x: -tangent.y, y: tangent.x };

  horses.forEach((horse, i) => {
    const { id, localId = i, name } = horse;
    const laneIndex = i % lanes.length;
    const lane = lanes[laneIndex];

    if (!lane || !Array.isArray(lane) || lane.length < 2) {
      console.warn(`[KD] ⚠️ Skipping horse dbId=${id} | localId=${localId} — lane ${laneIndex} is invalid`, lane);
      return;
    }

    console.log(`[KD] 🔍 Lane ${laneIndex} path (${lane.length} pts):`, JSON.stringify(lane.slice(0, 6)));

    const projected = projectPointToPath(origin, lane);

    if (!projected || !projected.point || !projected.direction) {
      console.warn(`[KD] ⚠️ Projection failed for horse dbId=${id} | localId=${localId} on lane ${laneIndex}`);
      return;
    }

    console.log(`[KD] 🔍 Horse ${name} | dbId=${id} | localId=${localId} → Projected @ index=${projected.index} t=${projected.t.toFixed(2)} dist=${projected.dist.toFixed(2)}`);

    const rotatedPath = rotatePathToStart(lane, projected.index, projected.t);

    if (!Array.isArray(rotatedPath) || rotatedPath.length < 2) {
      console.warn(`[KD] ⚠️ Rotated path for horse dbId=${id} is too short (len=${rotatedPath.length})`);
      return;
    }

    console.log(`[KD] 🔁 Rotated path length for horse dbId=${id}: ${rotatedPath.length}`);

    const dir = projected.direction;
    const offsetDistance = spriteWidth * 0.5;
    rotatedPath[0] = {
      x: projected.point.x - dir.x * offsetDistance,
      y: projected.point.y - dir.y * offsetDistance
    };

    rotatedPath.push({ ...rotatedPath[0] });

    let pathLength = 0;
    const segments = [];
    for (let j = 0; j < rotatedPath.length - 1; j++) {
      const dx = rotatedPath[j + 1].x - rotatedPath[j].x;
      const dy = rotatedPath[j + 1].y - rotatedPath[j].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push(len);
      pathLength += len;
    }

    horsePaths[id] = {
      path: rotatedPath,
      rotatedPath,
      laneIndex,
      pathLength,
      segments
    };

    console.log(`[KD] 🐴 Assigned horse ${name} → lane ${laneIndex}`);
    console.log(`[KD] 🎯 Start point at (${rotatedPath[0].x.toFixed(1)}, ${rotatedPath[0].y.toFixed(1)}) with pathLength = ${pathLength.toFixed(1)}`);
  });

  return horsePaths;
}

// --- HELPERS ---

function samplePathAtPercent(path, percent) {
  const totalLength = getPathLength(path);
  const target = totalLength * percent;

  let accumulated = 0;
  for (let i = 1; i < path.length; i++) {
    const p0 = path[i - 1];
    const p1 = path[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segLen >= target) {
      const t = (target - accumulated) / segLen;
      return {
        point: {
          x: p0.x + dx * t,
          y: p0.y + dy * t
        },
        tangent: {
          x: dx / segLen,
          y: dy / segLen
        }
      };
    }
    accumulated += segLen;
  }

  const fallback1 = path[0];
  const fallback2 = path[1] || path[0];
  return {
    point: fallback1,
    tangent: {
      x: fallback2.x - fallback1.x,
      y: fallback2.y - fallback1.y
    }
  };
}

function getPathLength(path) {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function projectPointToPath(point, path) {
  let closest = { index: 0, t: 0, dist: Infinity, point: null, direction: null };

  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i];
    const p1 = path[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = ((point.x - p0.x) * dx + (point.y - p0.y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = p0.x + clampedT * dx;
    const projY = p0.y + clampedT * dy;
    const dist = Math.hypot(projX - point.x, projY - point.y);

    if (dist < closest.dist) {
      closest = {
        index: i,
        t: clampedT,
        dist,
        point: { x: projX, y: projY },
        direction: { x: dx / Math.sqrt(lenSq), y: dy / Math.sqrt(lenSq) }
      };
    }
  }

  return closest;
}

function rotatePathToStart(path, segmentIndex, t) {
  if (!path || path.length < 2) return [];

  const p0 = path[segmentIndex];
  const p1 = path[(segmentIndex + 1) % path.length];
  const x = p0.x + (p1.x - p0.x) * t;
  const y = p0.y + (p1.y - p0.y) * t;

  const start = { x, y };
  const nextStart = (segmentIndex + 1) % path.length;
  const before = path.slice(nextStart).concat(path.slice(0, nextStart));

  return [start, ...before];
}

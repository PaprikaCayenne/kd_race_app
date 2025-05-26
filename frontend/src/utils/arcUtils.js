// File: frontend/src/utils/arcUtils.js
// Version: v1.2.0 — Ignores 0-length segments and logs fallback edge cases

export function getPointAtDistance(path, distance) {
  if (!Array.isArray(path) || path.length < 2) return null;

  const totalLength = path.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const dx = p.x - path[i - 1].x;
    const dy = p.y - path[i - 1].y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  let remaining = Math.max(0, Math.min(distance, totalLength));

  for (let i = 1; i < path.length; i++) {
    const p1 = path[i - 1];
    const p2 = path[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    if (segLength === 0) continue;

    if (remaining <= segLength) {
      const t = remaining / segLength;
      return {
        x: p1.x + dx * t,
        y: p1.y + dy * t
      };
    }

    remaining -= segLength;
  }

  console.warn('[KD] ⚠️ getPointAtDistance() hit fallback — returning last point');
  return path[path.length - 1];
}

export function getTangentAngle(path, distance) {
  if (!Array.isArray(path) || path.length < 2) return 0;

  const totalLength = path.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const dx = p.x - path[i - 1].x;
    const dy = p.y - path[i - 1].y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  let remaining = Math.max(0, Math.min(distance, totalLength));

  for (let i = 1; i < path.length; i++) {
    const p1 = path[i - 1];
    const p2 = path[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLength = Math.sqrt(dx * dx + dy * dy);

    if (segLength === 0) continue;

    if (remaining <= segLength) {
      return Math.atan2(dy, dx);
    }

    remaining -= segLength;
  }

  const last = path.at(-1);
  const prev = path.at(-2) || last;
  return Math.atan2(last.y - prev.y, last.x - prev.x);
}

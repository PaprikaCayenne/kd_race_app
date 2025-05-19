// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v1.8.2 — Starts path from top-middle (12 o’clock), rotates rawPoints before arc-length

/**
 * Generate a centerline path with arc-distance tracking and percent-based lookup.
 */
export function generateCenterline({
  canvasWidth,
  canvasHeight,
  trackHeight,
  totalLaneWidth,
  cornerRadius = 100,
  segmentsPerCurve = 12,
  trackPadding = 0
}) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const halfTrack = totalLaneWidth / 2;
  const left = trackPadding + halfTrack;
  const right = canvasWidth - trackPadding - halfTrack;

  const top = centerY - trackHeight / 2;
  const bottom = centerY + trackHeight / 2;

  const r = cornerRadius;
  const rawPoints = [];

  // Top straight
  rawPoints.push({ x: left + r, y: top });

  // Top-right curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI * 1.5 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // Bottom-right curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = 0 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // Bottom-left curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI / 2 + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // Top-left curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // 🔁 Rotate rawPoints so top-middle is index 0
  const topMiddle = { x: centerX, y: top };
  let minDist = Infinity;
  let topIndex = 0;

  rawPoints.forEach((pt, i) => {
    const dist = Math.hypot(pt.x - topMiddle.x, pt.y - topMiddle.y);
    if (dist < minDist) {
      minDist = dist;
      topIndex = i;
    }
  });

  const rotated = [...rawPoints.slice(topIndex), ...rawPoints.slice(0, topIndex)];

  // 🧮 Compute arc distances
  const path = [];
  let totalLength = 0;

  for (let i = 0; i < rotated.length; i++) {
    const curr = rotated[i];
    const prev = rotated[i - 1] || rotated[rotated.length - 1];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;

    path.push({
      ...curr,
      arcLength: totalLength
    });
  }

  const getPointAtDistance = (distance) => {
    const dist = distance % totalLength;

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i];
      const p1 = path[i + 1];
      const segLen = p1.arcLength - p0.arcLength;

      if (dist <= p1.arcLength) {
        const t = (dist - p0.arcLength) / segLen;
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const rotation = Math.atan2(dy, dx);
        return { x, y, rotation };
      }
    }

    const last = path.at(-1);
    const preLast = path.at(-2) || last;
    return {
      x: last.x,
      y: last.y,
      rotation: Math.atan2(last.y - preLast.y, last.x - preLast.x)
    };
  };

  return {
    path,
    length: path.length,
    totalArcLength: totalLength,
    getPointAtDistance,
    getCurveFactorAt: () => 1.0
  };
}

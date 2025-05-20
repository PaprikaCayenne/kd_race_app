// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v2.5.0 — Fixes top arc jump by starting from first real curve point

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

  // 🟢 Top-right curve (starts actual track, avoids off-canvas jump)
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI * 1.5 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // 🔵 Bottom-right
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = 0 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // 🟣 Bottom-left
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI / 2 + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // 🟠 Top-left
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // 🔁 Close loop
  rawPoints.push(rawPoints[0]);

  if (rawPoints.length < 2) {
    console.error('[KD] ❌ generateCenterline: Not enough points to compute path');
    return { path: [], totalArcLength: 0, length: 0 };
  }

  // 🧮 Compute arc-length
  const path = [];
  let totalLength = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    const prev = i > 0 ? rawPoints[i - 1] : rawPoints[0];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;

    path.push({
      ...curr,
      arcLength: totalLength
    });
  }

  // 🔁 Rotate to 12 o’clock (nearest to canvas center-top)
  const anchor = {
    x: canvasWidth / 2,
    y: top + r
  };

  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - anchor.x;
    const dy = path[i].y - anchor.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  const rotatedPath = [...path.slice(bestIndex), ...path.slice(0, bestIndex)];
  const delta = Math.sqrt(bestDist);

  const getPointAtDistance = (distance) => {
    const dist = distance % totalLength;

    for (let i = 0; i < rotatedPath.length - 1; i++) {
      const p0 = rotatedPath[i];
      const p1 = rotatedPath[i + 1];
      const segLen = p1.arcLength - p0.arcLength;

      if (dist <= p1.arcLength) {
        const t = (dist - p0.arcLength) / segLen;
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        const rotation = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        return { x, y, rotation };
      }
    }

    const last = rotatedPath.at(-1);
    const preLast = rotatedPath.at(-2) || last;
    return {
      x: last.x,
      y: last.y,
      rotation: Math.atan2(last.y - preLast.y, last.x - preLast.x)
    };
  };

  console.log(`[KD] 🎯 centerline[0] aligned to 12 o’clock → (${rotatedPath[0].x.toFixed(1)}, ${rotatedPath[0].y.toFixed(1)})`);
  console.log(`[KD] 📌 Nearest canvas anchor: (${anchor.x.toFixed(1)}, ${anchor.y.toFixed(1)}) → Δ=${delta.toFixed(2)}px`);
  console.log(`[KD] 🔁 Full arc length: ${totalLength.toFixed(2)} px | Points: ${rotatedPath.length}`);

  return {
    path: rotatedPath,
    length: rotatedPath.length,
    totalArcLength: totalLength,
    getPointAtDistance,
    getCurveFactorAt: () => 1.0
  };
}

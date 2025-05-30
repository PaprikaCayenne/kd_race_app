// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v2.8.0 — Fixes horizontal track overflow by applying padding symmetrically
// Date: 2025-05-26

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

  const halfTrack = totalLaneWidth / 2;

  const usableVertical = canvasHeight - 2 * (trackPadding + halfTrack);
  const finalTrackHeight = Math.min(trackHeight, usableVertical);

  const top = trackPadding + halfTrack;
  const bottom = top + finalTrackHeight;

  // ✅ FIX: Clamp left/right within padded range
  const usableWidth = canvasWidth - 2 * trackPadding;
  const left = trackPadding + halfTrack;
  const right = canvasWidth - trackPadding - halfTrack;

  const r = cornerRadius;
  const rawPoints = [];

  rawPoints.push({ x: centerX, y: top });

  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI * 1.5 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = 0 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI / 2 + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  rawPoints.push(rawPoints[0]);

  if (rawPoints.length < 2) {
    console.error('[KD] ❌ generateCenterline: Not enough points to compute path');
    return { path: [], totalArcLength: 0, length: 0 };
  }

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
        const rotation = Math.atan2(p1.y - p0.y, p1.x - p0.x);
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

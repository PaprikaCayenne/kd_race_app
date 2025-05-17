// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v1.8.1 — Adds totalArcLength metadata and accurate arc-distance sampling

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

  // Step 1: Compute arc distances
  const path = [];
  let totalLength = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    const prev = rawPoints[i - 1] || rawPoints[rawPoints.length - 1];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;

    path.push({
      ...curr,
      arcLength: totalLength
    });
  }

  // Step 2: Sample interpolated point at any arc-distance
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

    // fallback
    const last = path[path.length - 1];
    const preLast = path[path.length - 2] || last;
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
    getCurveFactorAt: () => 1.0 // Placeholder for future curve adjustment
  };
}

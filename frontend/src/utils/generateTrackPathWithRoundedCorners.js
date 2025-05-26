// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v2.7.0 — Dynamic vertical layout based on lane width and padding
// Date: 2025-05-24

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

  // 🧮 Track thickness is used to space inner/outer
  const halfTrack = totalLaneWidth / 2;

  // ✅ Step 1: Calculate how much vertical space is left *after* padding + halfTrack on both sides
  const usableVertical = canvasHeight - 2 * (trackPadding + halfTrack);

  // ✅ Step 2: Clamp trackHeight to fit if needed
  const finalTrackHeight = Math.min(trackHeight, usableVertical);

  // ✅ Step 3: Compute actual vertical bounds for the centerline
  const top = trackPadding + halfTrack;
  const bottom = top + finalTrackHeight;

  const left = trackPadding + halfTrack;
  const right = canvasWidth - trackPadding - halfTrack;

  const r = cornerRadius;
  const rawPoints = [];

  // 🟢 Start at top-center (12 o'clock)
  rawPoints.push({ x: centerX, y: top });

  // 🔵 Top-right curve
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI * 1.5 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // 🟣 Bottom-right
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = 0 + (Math.PI / 2) * t;
    rawPoints.push({
      x: right - r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // 🟠 Bottom-left
  for (let i = 1; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI / 2 + (Math.PI / 2) * t;
    rawPoints.push({
      x: left + r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // 🔴 Top-left
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

  console.log(`[KD] 🎯 centerline[0] set to 12 o’clock → (${path[0].x.toFixed(1)}, ${path[0].y.toFixed(1)})`);
  console.log(`[KD] 🔁 Full arc length: ${totalLength.toFixed(2)} px | Points: ${path.length}`);

  return {
    path,
    length: path.length,
    totalArcLength: totalLength,
    getPointAtDistance,
    getCurveFactorAt: () => 1.0
  };
}

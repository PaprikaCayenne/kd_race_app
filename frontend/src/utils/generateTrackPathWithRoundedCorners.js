// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v1.7.3 — Decouples track height from canvas height and centers vertically

/**
 * Generate a centerline path that spans the padded canvas and allows lane offset expansion.
 */
export function generateCenterline({
  canvasWidth,
  canvasHeight,
  trackHeight,            // ← actual height of the track path
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

  // ✅ Use trackHeight instead of full canvas height to calculate vertical bounds
  const top = centerY - trackHeight / 2;
  const bottom = centerY + trackHeight / 2;

  const r = cornerRadius;
  const path = [];

  // Top straight
  path.push({ x: left + r, y: top });

  // Top-right curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = (Math.PI * 1.5) + (Math.PI / 2) * t;
    path.push({
      x: right - r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  // Bottom-right
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = 0 + (Math.PI / 2) * t;
    path.push({
      x: right - r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // Bottom-left curve
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = (Math.PI / 2) + (Math.PI / 2) * t;
    path.push({
      x: left + r + Math.cos(angle) * r,
      y: bottom - r + Math.sin(angle) * r
    });
  }

  // Top-left
  for (let i = 0; i <= segmentsPerCurve; i++) {
    const t = i / segmentsPerCurve;
    const angle = Math.PI + (Math.PI / 2) * t;
    path.push({
      x: left + r + Math.cos(angle) * r,
      y: top + r + Math.sin(angle) * r
    });
  }

  return path;
}

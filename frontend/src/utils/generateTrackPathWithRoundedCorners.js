// File: frontend/src/utils/generateTrackPathWithRoundedCorners.js
// Version: v0.1.2 — Adds offsetX and offsetY for visual centering

/**
 * Generates a centerline path for an oval track using corner control points
 * and straight lines — mimics Photoshop-style rounded rectangle logic.
 */
function generateTrackPathWithRoundedCorners({ width, height, cornerRadius, segmentsPerCurve = 12, offsetX = 0, offsetY = 0 }) {
    const path = [];
  
    const left = offsetX;
    const right = offsetX + width;
    const top = offsetY;
    const bottom = offsetY + height;
    const r = cornerRadius;
  
    // Start at top-left corner, just before curve
    path.push({ x: left + r, y: top });
  
    // Top edge → top-right corner
    for (let i = 0; i <= segmentsPerCurve; i++) {
      const t = i / segmentsPerCurve;
      const angle = (Math.PI * 1.5) + (Math.PI / 2) * t;
      path.push({
        x: right - r + Math.cos(angle) * r,
        y: top + r + Math.sin(angle) * r
      });
    }
  
    // Right edge → bottom-right corner
    for (let i = 0; i <= segmentsPerCurve; i++) {
      const t = i / segmentsPerCurve;
      const angle = 0 + (Math.PI / 2) * t;
      path.push({
        x: right - r + Math.cos(angle) * r,
        y: bottom - r + Math.sin(angle) * r
      });
    }
  
    // Bottom edge → bottom-left corner
    for (let i = 0; i <= segmentsPerCurve; i++) {
      const t = i / segmentsPerCurve;
      const angle = (Math.PI / 2) + (Math.PI / 2) * t;
      path.push({
        x: left + r + Math.cos(angle) * r,
        y: bottom - r + Math.sin(angle) * r
      });
    }
  
    // Left edge → top-left corner
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
  
  export { generateTrackPathWithRoundedCorners };
  
// File: frontend/src/utils/generateRoundedRectCenterline.js
// Version: v0.1.2 – Generate centerline using midpoint between outer and inner track bounds

/**
 * Generate a discretized rounded rectangle path using bounds and corner radius.
 * Used for calculating central path between inner and outer track boundaries.
 *
 * @param {object} bounds - { x, y, width, height } of the path rectangle
 * @param {number} radius - corner radius
 * @param {number} segments - total number of segments
 * @returns {Array<{x: number, y: number}>}
 */
export function generateRoundedRectCenterline(bounds, radius, segments = 400) {
    const points = [];
    const { x, y, width, height } = bounds;
  
    const straightH = width - 2 * radius;
    const straightV = height - 2 * radius;
    const arcSeg = Math.floor(segments / 4 / 2);
    const sideSeg = Math.floor(segments / 4);
  
    // Top-left corner (180° to 270°)
    for (let i = 0; i <= arcSeg; i++) {
      const theta = Math.PI + (Math.PI / 2) * (i / arcSeg);
      points.push({
        x: x + radius + radius * Math.cos(theta),
        y: y + radius + radius * Math.sin(theta)
      });
    }
  
    // Top horizontal
    for (let i = 1; i <= sideSeg; i++) {
      points.push({
        x: x + radius + (straightH * i) / sideSeg,
        y: y
      });
    }
  
    // Top-right corner (270° to 360°)
    for (let i = 0; i <= arcSeg; i++) {
      const theta = (3 * Math.PI) / 2 + (Math.PI / 2) * (i / arcSeg);
      points.push({
        x: x + width - radius + radius * Math.cos(theta),
        y: y + radius + radius * Math.sin(theta)
      });
    }
  
    // Right vertical
    for (let i = 1; i <= sideSeg; i++) {
      points.push({
        x: x + width,
        y: y + radius + (straightV * i) / sideSeg
      });
    }
  
    // Bottom-right corner (0° to 90°)
    for (let i = 0; i <= arcSeg; i++) {
      const theta = (Math.PI / 2) * (i / arcSeg);
      points.push({
        x: x + width - radius + radius * Math.cos(theta),
        y: y + height - radius + radius * Math.sin(theta)
      });
    }
  
    // Bottom horizontal
    for (let i = 1; i <= sideSeg; i++) {
      points.push({
        x: x + width - radius - (straightH * i) / sideSeg,
        y: y + height
      });
    }
  
    // Bottom-left corner (90° to 180°)
    for (let i = 0; i <= arcSeg; i++) {
      const theta = Math.PI / 2 + (Math.PI / 2) * (i / arcSeg);
      points.push({
        x: x + radius + radius * Math.cos(theta),
        y: y + height - radius + radius * Math.sin(theta)
      });
    }
  
    // Left vertical
    for (let i = 1; i <= sideSeg; i++) {
      points.push({
        x: x,
        y: y + height - radius - (straightV * i) / sideSeg
      });
    }
  
    return points;
  }
  
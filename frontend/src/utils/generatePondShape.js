// File: frontend/src/utils/generatePondShape.js
// Version: v0.2.0 — Organic rounded pond shape using sine/cosine wave edges

/**
 * Generate a rounded decorative pond shape using sinusoidal edges.
 * @param {number} cx - center x
 * @param {number} cy - center y
 * @param {number} width - width of pond
 * @param {number} height - height of pond
 * @param {number} waves - number of waves along each edge
 * @returns {Array<{x: number, y: number}>}
 */
export function generatePondShape(cx, cy, width, height, waves = 4) {
    const points = [];
    const left = cx - width / 2;
    const top = cy - height / 2;
    const waveHeight = 10;
  
    // Top edge (wavy)
    for (let i = 0; i <= waves; i++) {
      const x = left + (i * width) / waves;
      const y = top + Math.sin((i * Math.PI) / waves) * waveHeight;
      points.push({ x, y });
    }
  
    // Right edge (wavy)
    for (let i = 0; i <= waves; i++) {
      const y = top + (i * height) / waves;
      const x = left + width + Math.cos((i * Math.PI) / waves) * waveHeight;
      points.push({ x, y });
    }
  
    // Bottom edge (wavy)
    for (let i = waves; i >= 0; i--) {
      const x = left + (i * width) / waves;
      const y = top + height - Math.sin((i * Math.PI) / waves) * waveHeight;
      points.push({ x, y });
    }
  
    // Left edge (wavy)
    for (let i = waves; i >= 0; i--) {
      const y = top + (i * height) / waves;
      const x = left - Math.cos((i * Math.PI) / waves) * waveHeight;
      points.push({ x, y });
    }
  
    return points;
  }
  
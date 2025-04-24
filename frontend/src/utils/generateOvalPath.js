// File: frontend/src/utils/generateOvalPath.js
// Version: v0.2.0 – Churchill Downs-inspired path with seed support

import seedrandom from 'seedrandom';

/**
 * Generate a Churchill-style oval path.
 *
 * @param {Object} opts
 * @param {number} opts.centerX
 * @param {number} opts.centerY
 * @param {number} opts.radiusX - horizontal curve radius
 * @param {number} opts.radiusY - vertical curve radius
 * @param {number} opts.straightLength - length of the straight segments
 * @param {number} opts.resolution - number of total points
 * @param {string} [opts.seed]
 * @returns {Array<{x: number, y: number}>}
 */
export function generateOvalPath({
  centerX,
  centerY,
  radiusX,
  radiusY,
  straightLength = 300,
  resolution = 400,
  seed = null,
}) {
  const rng = seed ? seedrandom(seed) : Math.random;
  const points = [];
  const halfSeg = Math.floor(resolution / 2);

  // Semicircle (left turn)
  for (let i = 0; i <= halfSeg; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / halfSeg;
    const x = centerX - straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Straight (backstretch)
  for (let i = 1; i <= halfSeg; i++) {
    const x = centerX - straightLength / 2 + (straightLength * i) / halfSeg;
    const y = centerY + radiusY;
    points.push({ x, y });
  }

  // Semicircle (right turn)
  for (let i = 0; i <= halfSeg; i++) {
    const angle = (3 * Math.PI) / 2 + (Math.PI * i) / halfSeg;
    const x = centerX + straightLength / 2 + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    points.push({ x, y });
  }

  // Straight (homestretch)
  for (let i = 1; i <= halfSeg; i++) {
    const x = centerX + straightLength / 2 - (straightLength * i) / halfSeg;
    const y = centerY - radiusY;
    points.push({ x, y });
  }

  return points;
}

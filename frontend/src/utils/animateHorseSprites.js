// File: frontend/src/utils/animateHorseSprites.js
// Version: v0.3.0 – Center-aligned triangle sprites at path start with color and direction

import { Graphics } from 'pixi.js';

/**
 * Animate horse sprites along their individual paths.
 * @param {import('pixi.js').Application} app
 * @param {Array<Array<{x: number, y: number}>>} horsePaths
 * @param {number} speedFactor – Controls duration of full lap
 * @param {number} baseIndex – Optional lane index offset
 * @returns {Map<number, Graphics>} sprite references by lane index
 */
export function animateHorseSprites(app, horsePaths, speedFactor = 1.0, baseIndex = 0) {
  const horseSprites = new Map();
  const startTime = performance.now();
  const duration = 10000 / speedFactor;

  horsePaths.forEach((path, i) => {
    const color = 0xff0000 + i * 0x1111;
    const sprite = new Graphics()
      .beginFill(color)
      .moveTo(0, -10)
      .lineTo(10, 10)
      .lineTo(-10, 10)
      .lineTo(0, -10)
      .endFill();

    const start = path[0];
    sprite.position.set(start.x, start.y);
    sprite.pivot.set(0, 0); // Center pivot if needed
    app.stage.addChild(sprite);
    horseSprites.set(i + baseIndex, sprite);
  });

  app.ticker.add(() => {
    const now = performance.now();
    const elapsed = now - startTime;
    const t = (elapsed % duration) / duration;

    horsePaths.forEach((path, i) => {
      const sprite = horseSprites.get(i + baseIndex);
      const index = Math.floor(t * (path.length - 1));
      const { x, y } = path[index];
      sprite.position.set(x, y);
    });
  });

  return horseSprites;
}

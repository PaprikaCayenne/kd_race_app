// File: frontend/src/utils/simulateHorses.js
// Version: v0.1.0 – Initial horse simulation using staggered start points

import { Graphics } from 'pixi.js';
import { Color } from 'pixi.js';

export function simulateHorses(app, container, trackLayout) {
  const { innerX, innerY, innerW, innerH } = trackLayout;
  const numHorses = 4;
  const trackMargin = 15;
  const horseRadius = 10;
  const totalDistance = 1000;
  const speedFactor = 1.2;

  const horses = [];

  for (let i = 0; i < numHorses; i++) {
    const sprite = new Graphics()
      .beginFill(new Color(`hsl(${(i * 90) % 360}, 80%, 50%)`).toNumber())
      .drawCircle(0, 0, horseRadius)
      .endFill();

    // Position horses staggered near left side, just inside the track bounds
    sprite.x = innerX - trackMargin;
    sprite.y = innerY + (i + 1) * (innerH / (numHorses + 1));
    app.stage.addChild(sprite);

    horses.push({ sprite, pct: 0 });
  }

  app.ticker.add(() => {
    horses.forEach(h => {
      h.pct += 0.002 * speedFactor;
      if (h.pct > 1) h.pct = 1;
      h.sprite.x = innerX + h.pct * (innerW + trackMargin);
    });
  });

  console.log('[KD] 🐎 Simulating horses:', horses.map(h => h.pct));
}
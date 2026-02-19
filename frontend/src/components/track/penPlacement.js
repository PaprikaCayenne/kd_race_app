// File: frontend/src/components/track/penPlacement.js
// Version: v1.1.0 — Deterministic non-overlapping pen placement with dynamic sprite sizing
// Date: 2026-02-19

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function hashHorse(horse) {
  const source = `${horse?.id || ''}-${horse?.localId || ''}-${horse?.name || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function computeGrid(count, availableW, availableH, gap, minSprite, targetSprite, maxSprite) {
  if (count <= 0) {
    return { cols: 1, rows: 1, sprite: minSprite, cellW: availableW, cellH: availableH };
  }

  let cols = Math.max(1, Math.ceil(Math.sqrt(count * (availableW / Math.max(1, availableH)))));
  let rows = Math.max(1, Math.ceil(count / cols));

  const measure = () => {
    const cellW = (availableW - (gap * (cols - 1))) / cols;
    const cellH = (availableH - (gap * (rows - 1))) / rows;
    const sprite = clamp(Math.floor(Math.min(cellW, cellH, targetSprite)), minSprite, maxSprite);
    return { cellW, cellH, sprite };
  };

  let metrics = measure();

  while (metrics.sprite < minSprite && cols < count) {
    cols += 1;
    rows = Math.ceil(count / cols);
    metrics = measure();
  }

  while (metrics.sprite < minSprite && rows < count) {
    rows += 1;
    cols = Math.ceil(count / rows);
    metrics = measure();
  }

  return {
    cols,
    rows,
    sprite: Math.max(24, Math.floor(metrics.sprite)),
    cellW: Math.max(1, metrics.cellW),
    cellH: Math.max(1, metrics.cellH)
  };
}

export function computePenPlacements(horses, penBounds, options = {}) {
  if (!Array.isArray(horses) || !penBounds) return [];

  const gap = Number(options.gap) || 3;
  const insetX = Number(options.insetX) || 8;
  const insetTop = Number(options.insetTop) || 6;
  const insetBottom = Number(options.insetBottom) || 8;

  const targetSprite = Number(options.spriteSize) || 64;
  const minSprite = Number(options.minSpriteSize) || 48;
  const maxSprite = Number(options.maxSpriteSize) || Math.max(minSprite, targetSprite);

  const availableW = Math.max(0, penBounds.width - (insetX * 2));
  const availableH = Math.max(0, penBounds.height - insetTop - insetBottom);

  if (availableW <= 0 || availableH <= 0) return [];

  const grid = computeGrid(
    horses.length,
    availableW,
    availableH,
    gap,
    Math.min(minSprite, targetSprite),
    targetSprite,
    maxSprite
  );

  const slots = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cellX = insetX + col * (grid.cellW + gap);
      const cellY = insetTop + row * (grid.cellH + gap);

      slots.push({
        x: cellX,
        y: cellY,
        cellW: grid.cellW,
        cellH: grid.cellH
      });
    }
  }

  const capacity = Math.min(horses.length, slots.length);

  return horses.slice(0, capacity).map((horse) => {
    const rng = seeded(hashHorse(horse));
    const idx = Math.floor(rng() * slots.length);
    const slot = slots.splice(idx, 1)[0] || {
      x: insetX,
      y: insetTop,
      cellW: grid.cellW,
      cellH: grid.cellH
    };

    const slackX = Math.max(0, slot.cellW - grid.sprite);
    const slackY = Math.max(0, slot.cellH - grid.sprite);
    const jitterX = (rng() - 0.5) * Math.min(6, slackX);
    const jitterY = (rng() - 0.5) * Math.min(6, slackY);

    const rawX = slot.x + (slackX / 2) + jitterX;
    const rawY = slot.y + (slackY / 2) + jitterY;

    return {
      horse,
      x: clamp(rawX, insetX, Math.max(insetX, insetX + availableW - grid.sprite)),
      y: clamp(rawY, insetTop, Math.max(insetTop, insetTop + availableH - grid.sprite)),
      size: grid.sprite
    };
  });
}

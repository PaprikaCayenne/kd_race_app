// File: frontend/src/components/track/penPlacement.js
// Version: v1.0.0 — Shared deterministic pen placement for DOM and PIXI staging
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

export function computePenPlacements(horses, penBounds, options = {}) {
  if (!Array.isArray(horses) || !penBounds) return [];

  const sprite = Number(options.spriteSize) || 64;
  const gap = Number(options.gap) || 3;
  const insetX = Number(options.insetX) || 8;
  const insetTop = Number(options.insetTop) || 6;
  const insetBottom = Number(options.insetBottom) || 8;
  const availableW = Math.max(0, penBounds.width - insetX * 2);
  const availableH = Math.max(0, penBounds.height - insetTop - insetBottom);
  const cell = sprite + gap;
  const cols = Math.max(1, Math.floor((availableW + gap) / cell));
  const rows = Math.max(1, Math.floor((availableH + gap) / cell));
  const capacity = cols * rows;

  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = insetX + col * cell;
      const y = insetTop + row * cell;
      slots.push({
        x: clamp(x, insetX, Math.max(insetX, insetX + availableW - sprite)),
        y: clamp(y, insetTop, Math.max(insetTop, insetTop + availableH - sprite))
      });
    }
  }

  return horses.slice(0, capacity).map((horse) => {
    const rng = seeded(hashHorse(horse));
    const idx = Math.floor(rng() * slots.length);
    const slot = slots.splice(idx, 1)[0] || { x: insetX, y: insetTop };
    return { horse, x: slot.x, y: slot.y, size: sprite };
  });
}


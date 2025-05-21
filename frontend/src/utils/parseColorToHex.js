// File: frontend/src/utils/parseColorToHex.js
// Version: v1.1.0 — Matches full horse color list from seed.ts

const NAMED_COLORS = {
  red: 0xff0000,
  blue: 0x0000ff,
  green: 0x00ff00,
  yellow: 0xffff00,
  purple: 0x800080,
  orange: 0xffa500,
  pink: 0xff69b4,
  black: 0x000000,
  white: 0xffffff,
  gray: 0x808080,
  teal: 0x008080,
  navy: 0x000080,
  lime: 0x00ff00,
  cyan: 0x00ffff,
  maroon: 0x800000,
  olive: 0x808000,
  beige: 0xf5f5dc,
  indigo: 0x4b0082,
  aqua: 0x00ffff,
  tan: 0xd2b48c,
  charcoal: 0x36454f,
  silver: 0xc0c0c0
};

export default function parseColorToHex(name) {
  if (!name) return 0xaaaaaa;
  const clean = name.trim().toLowerCase();
  return NAMED_COLORS[clean] ?? 0xaaaaaa;
}

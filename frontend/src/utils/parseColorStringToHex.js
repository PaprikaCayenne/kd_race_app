// File: frontend/src/utils/parseColorStringToHex.js
// Version: v0.2.1 — Full hardcoded color map only (no canvas fallback)

const COLOR_MAP = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#00ff00',
  yellow: '#ffff00',
  purple: '#800080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  gray: '#808080',
  teal: '#008080',
  navy: '#000080',
  lime: '#00ff00',
  cyan: '#00ffff',
  maroon: '#800000',
  olive: '#808000',
  beige: '#f5f5dc',
  white: '#ffffff',
  indigo: '#4b0082',
  aqua: '#00ffff',
  tan: '#d2b48c',
  charcoal: '#36454f',
  silver: '#c0c0c0'
};

export function parseColorStringToHex(colorString, horseId = null) {
  if (typeof colorString !== 'string') {
    console.warn(`[KD] ⚠️ Invalid color type for horse ${horseId ?? 'unknown'}:`, colorString);
    return 0xff00ff; // fallback magenta
  }

  const normalized = colorString.trim().toLowerCase();
  const hex = COLOR_MAP[normalized];

  if (hex) {
    const parsed = parseInt(hex.slice(1), 16);
    console.log(`[KD] 🧪 Parsed hex for horse ${horseId}: ${normalized} → ${hex}`);
    return parsed;
  }

  console.warn(`[KD] ⚠️ Unknown color string for horse ${horseId ?? 'unknown'}:`, colorString);
  return 0xff00ff; // fallback magenta
}

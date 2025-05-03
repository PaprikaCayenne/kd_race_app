// File: api/utils/generateSpeedPattern.ts
// Version: v0.1.1 — Default export

export default function generateSpeedPattern(length: number, seed: number) {
    const rng = mulberry32(seed);
    const pattern = [];
  
    for (let i = 0; i < length; i++) {
      const angle = rng() * Math.PI * 2;
      const magnitude = rng() * 0.8 + 0.2;
      pattern.push({
        dx: Math.cos(angle) * magnitude,
        dy: Math.sin(angle) * magnitude
      });
    }
  
    return pattern;
  }
  
  function mulberry32(a: number) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
// File: frontend/src/utils/playReplay.js
// Version: v0.1.1 — Refines curve logic, speed multiplier, rotation, and finish logs

export function playReplay({ app, horseSprites, labelSprites, horsePaths, replayData }) {
    if (app.__replayTicker) {
      console.log('[KD] 🔁 Clearing previous replay');
      app.ticker.remove(app.__replayTicker);
      app.__replayTicker = null;
    }
  
    const startTime = performance.now();
    const horseIds = Object.keys(replayData);
    const framePointers = Object.fromEntries(horseIds.map(id => [id, 0]));
  
    const ticker = () => {
      const now = performance.now();
      const timeElapsed = now - startTime;
  
      horseIds.forEach(id => {
        const frames = replayData[id];
        if (!frames || frames.length === 0) return;
  
        while (
          framePointers[id] < frames.length - 1 &&
          frames[framePointers[id] + 1].timeMs < timeElapsed
        ) {
          framePointers[id]++;
        }
  
        const curr = frames[framePointers[id]];
        const next = frames[framePointers[id] + 1] || curr;
        const lerpT = (timeElapsed - curr.timeMs) / ((next.timeMs - curr.timeMs) || 1);
        const pct = curr.pct + ((next.pct - curr.pct) * lerpT);
  
        const path = horsePaths[id]?.path;
        if (!path || path.length < 2) return;
  
        const index = Math.floor(pct * path.length);
        const cappedIdx = Math.min(index, path.length - 2);
        const p1 = path[cappedIdx];
        const p2 = path[cappedIdx + 1];
        const interpT = (pct * path.length) - cappedIdx;
        const x = p1.x + (p2.x - p1.x) * interpT;
        const y = p1.y + (p2.y - p1.y) * interpT;
  
        const sprite = horseSprites.get(Number(id));
        if (sprite) {
          sprite.position.set(x, y);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          sprite.rotation = Math.atan2(dy, dx);
        }
  
        const label = labelSprites.get(Number(id));
        if (label) {
          label.position.set(x, y);
        }
      });
    };
  
    app.ticker.add(ticker);
    app.__replayTicker = ticker;
  }
  
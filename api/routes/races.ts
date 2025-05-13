// File: frontend/src/utils/playRace.js
// Version: v0.2.2 — Triggered by frontend Start Race button, not race:start socket

export function playRace({ app, horseSprites, horsePaths, labelSprites, finishedHorses, horses }) {
  // Stop any existing ticker first
  app.ticker.stop();
  app.ticker.removeAll();
  
  const ticker = (delta) => {
    horseSprites.forEach((sprite, id) => {
      const path = horsePaths[id];
      if (!path || path.length < 2 || finishedHorses.has(id)) return;

      sprite.__progress = (sprite.__progress ?? 0) + 0.002 * delta;

      if (sprite.__progress >= 1) {
        sprite.__progress = 1;
        finishedHorses.add(id);
        if (finishedHorses.size === horses.length) {
          console.log('[KD] 🏁 All horses finished!');
          const winner = horses.find(h => h.placement === 1);
          console.log(`[KD] 🏆 Winner: Horse ${winner.name} (ID: ${winner.id})`);
        }
        return;
      }

      const idx = Math.floor(sprite.__progress * path.length);
      const cappedIdx = Math.min(idx, path.length - 2);
      const next = path[cappedIdx + 1];
      const curr = path[cappedIdx];
      const lerpT = (sprite.__progress * path.length) - cappedIdx;
      const x = curr.x + (next.x - curr.x) * lerpT;
      const y = curr.y + (next.y - curr.y) * lerpT;
      sprite.position.set(x, y);
      sprite.rotation = Math.atan2(next.y - curr.y, next.x - curr.x);

      const label = labelSprites.get(id);
      if (label) label.position.set(x, y);
    });
  };

  app.ticker.add(ticker);
  app.ticker.start();
}

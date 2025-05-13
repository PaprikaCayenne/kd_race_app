// File: frontend/src/utils/playRace.js
// Version: v0.6.0 — Uses speedMap for per-horse realism

const SPEED_MULTIPLIER = 0.001;
const MAX_ROTATION_DELTA = 0.05;

export function playRace({ app, horseSprites, horsePaths, labelSprites, finishedHorses, horses }) {
  const lapFinished = new Set();
  let winnerDeclared = false;

  console.log('[KD] 🎬 Starting race via playRace');
  console.log('[KD] 🚩 Horses in race:', [...horseSprites.keys()]);

  if (app.__raceTicker) {
    console.log('[KD] 🔄 Removing previous ticker');
    app.ticker.remove(app.__raceTicker);
    app.__raceTicker = null;
  }

  const ticker = (delta) => {
    horseSprites.forEach((sprite, id) => {
      const pathData = horsePaths[id];
      if (!pathData?.path || pathData.path.length < 2 || finishedHorses.has(id)) {
        if (!pathData) console.warn(`[KD] ⚠️ Missing pathData for horse ${id}`);
        return;
      }

      const path = pathData.path;
      const speedMap = pathData.speedMap || [];
      const finishIndex = pathData.debug?.finishIndex;
      if (finishIndex == null) {
        console.warn(`[KD] ⚠️ No finishIndex for horse ${id}`);
        return;
      }

      if (!sprite.__started) {
        sprite.__started = true;
        sprite.__progress = 0.001;

        const curr = path[0];
        const next = path[1];
        sprite.position.set(curr.x, curr.y);
        sprite.__rotation = Math.atan2(next.y - curr.y, next.x - curr.x);
        sprite.rotation = sprite.__rotation;

        const label = labelSprites.get(id);
        if (label) label.position.set(curr.x, curr.y);

        console.log(`[KD] 🐎 Initialized sprite ${id} at (${curr.x.toFixed(1)}, ${curr.y.toFixed(1)})`);
        return;
      }

      const currentIdx = Math.floor(sprite.__progress * path.length);
      const speedFactor = speedMap[currentIdx] ?? 1;
      sprite.__progress = (sprite.__progress ?? 0) + SPEED_MULTIPLIER * speedFactor * delta;

      if (!lapFinished.has(id) && currentIdx >= finishIndex) {
        lapFinished.add(id);
        finishedHorses.add(id);

        if (!winnerDeclared) {
          const winner = horses.find(h => h.id === id);
          console.log(`[KD] 🏆 Winner: Horse ${winner.name} (ID: ${winner.id})`);
          winnerDeclared = true;
        }

        if (lapFinished.size === horses.length) {
          console.log('[KD] 🏁 All horses finished!');
        }
      }

      const idx = Math.floor(sprite.__progress * path.length);
      const cappedIdx = Math.min(idx, path.length - 2);
      const curr = path[cappedIdx];
      const next = path[cappedIdx + 1];

      const lerpT = (sprite.__progress * path.length) - cappedIdx;
      const x = curr.x + (next.x - curr.x) * lerpT;
      const y = curr.y + (next.y - curr.y) * lerpT;

      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1e-2) return;

      sprite.position.set(x, y);

      const desired = Math.atan2(dy, dx);
      let current = sprite.__rotation ?? 0;
      let deltaRot = desired - current;

      while (deltaRot > Math.PI) deltaRot -= 2 * Math.PI;
      while (deltaRot < -Math.PI) deltaRot += 2 * Math.PI;

      deltaRot = Math.max(-MAX_ROTATION_DELTA, Math.min(MAX_ROTATION_DELTA, deltaRot));
      sprite.__rotation = current + deltaRot;
      sprite.rotation = sprite.__rotation;

      const label = labelSprites.get(id);
      if (label) label.position.set(x, y);
    });
  };

  app.ticker.add(ticker);
  app.__raceTicker = ticker;
}

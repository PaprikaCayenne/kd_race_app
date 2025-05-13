// Version: v0.4.0 — Adds MAX_ROTATION_DELTA to smooth sharp turns

const SPEED_MULTIPLIER = 0.0008;
const MAX_ROTATION_DELTA = 0.05; // radians/frame

export function playRace({ app, horseSprites, horsePaths, labelSprites, finishedHorses, horses }) {
  const ticker = (delta) => {
    horseSprites.forEach((sprite, id) => {
      const path = horsePaths[id];
      if (!path || path.length < 2 || finishedHorses.has(id)) return;

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

        const expected = horses.find(h => h.id === id)?.startPoint;
        console.log(`[KD] 🐴 Start Verification — Horse ${id} expected: (${expected?.x?.toFixed(1)}, ${expected?.y?.toFixed(1)}), actual: (${curr.x.toFixed(1)}, ${curr.y.toFixed(1)})`);
        console.log(`[KD] 🧪 Horse ${id} path[0]: (${path[0].x.toFixed(1)}, ${path[0].y.toFixed(1)}), path[1]: (${path[1].x.toFixed(1)}, ${path[1].y.toFixed(1)})`);
        return;
      }

      sprite.__progress = (sprite.__progress ?? 0) + SPEED_MULTIPLIER * delta;

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
      const curr = path[cappedIdx];
      const next = path[cappedIdx + 1];

      const lerpT = (sprite.__progress * path.length) - cappedIdx;
      const x = curr.x + (next.x - curr.x) * lerpT;
      const y = curr.y + (next.y - curr.y) * lerpT;

      // Prevent movement if path segment is too small
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1e-2) return;

      sprite.position.set(x, y);

      // Rotation easing
      const desired = Math.atan2(dy, dx);
      let current = sprite.__rotation ?? 0;
      let deltaRot = desired - current;

      while (deltaRot > Math.PI) deltaRot -= 2 * Math.PI;
      while (deltaRot < -Math.PI) deltaRot += 2 * Math.PI;

      // Clamp delta to prevent sharp flipping
      if (deltaRot > MAX_ROTATION_DELTA) deltaRot = MAX_ROTATION_DELTA;
      if (deltaRot < -MAX_ROTATION_DELTA) deltaRot = -MAX_ROTATION_DELTA;

      current += deltaRot;
      sprite.__rotation = current;
      sprite.rotation = current;

      const label = labelSprites.get(id);
      if (label) label.position.set(x, y);
    });
  };

  app.ticker.add(ticker);
}

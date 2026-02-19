// File: frontend/src/utils/playReplay.js
// Version: v0.3.0 — Adds explicit replay stop helper and auto-stop at replay end

export function stopReplay(app) {
  if (!app?.__replayTicker) return;
  app.ticker.remove(app.__replayTicker);
  app.__replayTicker = null;
}

export function playReplay({ app, horseSprites, labelSprites, horsePaths, replayData }) {
  if (!app) return;
  if (app.__replayTicker) {
    console.log('[KD] 🔁 Clearing previous replay');
    stopReplay(app);
  }

  const startTime = performance.now();
  const horseIds = Object.keys(replayData);
  if (horseIds.length === 0) return;

  const framePointers = Object.fromEntries(horseIds.map(id => [id, 0]));
  const maxReplayTime = Math.max(
    ...horseIds.map((id) => {
      const frames = replayData[id] || [];
      return frames.length > 0 ? frames[frames.length - 1].time : 0;
    })
  );

  const ticker = () => {
    const now = performance.now();
    const timeElapsed = now - startTime;
    let finishedCount = 0;

    horseIds.forEach(id => {
      const frames = replayData[id];
      if (!frames || frames.length === 0) return;

      if (timeElapsed >= frames[frames.length - 1].time) {
        finishedCount += 1;
      }

      while (
        framePointers[id] < frames.length - 1 &&
        frames[framePointers[id] + 1].time < timeElapsed
      ) {
        framePointers[id]++;
      }

      const curr = frames[framePointers[id]];
      const next = frames[framePointers[id] + 1] || curr;
      const lerpT = (timeElapsed - curr.time) / ((next.time - curr.time) || 1);
      const interpDistance = curr.distance + ((next.distance - curr.distance) * lerpT);

      const path = horsePaths.get(Number(id));
      if (!path || typeof path.getPointAtDistance !== 'function') return;

      const { x, y, rotation } = path.getPointAtDistance(interpDistance);

      const sprite = horseSprites.get(Number(id));
      if (sprite) {
        sprite.position.set(x, y);
        sprite.rotation = rotation;
      }

      const label = labelSprites.get(Number(id));
      if (label) {
        label.position.set(x, y - 20);
      }
    });

    if (finishedCount === horseIds.length && timeElapsed >= maxReplayTime + 300) {
      stopReplay(app);
    }
  };

  app.ticker.add(ticker);
  app.__replayTicker = ticker;
}

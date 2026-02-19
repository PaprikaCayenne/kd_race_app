// File: frontend/src/components/track/setupHorses.js
// Version: v2.9.0 — Supports staging pen placement and always-visible horse labels for walk-in
// Date: 2026-02-18

import { Sprite, Text, TextStyle, Graphics } from 'pixi.js';
import { drawHorseSprite } from '@/utils/drawHorseSprite';
import { computePenPlacements } from './penPlacement';

export function setupHorses({
  app,
  horses,
  horseSpritesRef,
  labelSpritesRef,
  finishedHorsesRef,
  debugPathLinesRef,
  debugDotsRef,
  finishDotsRef,
  startDotsRef,
  horsePathsRef,
  lanes,
  debugVisible = false,
  setRaceWarnings = () => {},
  stagingArea = null,
  placeInStaging = false
}) {
  const log = (...args) => console.log('[KD]', ...args);
  const warn = (...args) => console.warn('[KD] ⚠️', ...args);

  log(`🧩 setupHorses(): received ${horses.length} horses`);
  const horsePaths = horsePathsRef.current;

  let successCount = 0;
  let failCount = 0;
  const stagingByLocalId = new Map();
  if (placeInStaging && stagingArea) {
    const placements = computePenPlacements(horses, stagingArea, { spriteSize: 42, insetTop: 4, gap: 4 });
    placements.forEach((entry) => {
      stagingByLocalId.set(entry.horse.localId, entry);
    });
  }

  horseSpritesRef.current?.clear?.();
  labelSpritesRef.current?.clear?.();
  finishedHorsesRef.current?.clear?.();

  horseSpritesRef.current = new Map();
  labelSpritesRef.current = new Map();
  finishedHorsesRef.current = new Set();
  debugPathLinesRef.current = [];
  debugDotsRef.current = [];
  finishDotsRef.current = [];
  startDotsRef.current = [];

  horses.forEach((horse) => {
    const key = horse.localId;
    const pathData = horsePaths?.get(key);

    if (
      !pathData ||
      !Array.isArray(pathData.path) ||
      pathData.path.length < 2 ||
      typeof pathData.getPointAtDistance !== 'function'
    ) {
      const warning = `❌ Invalid path for horse: ${horse.name} (localId: ${key})`;
      warn(warning);
      setRaceWarnings((prev) => [...prev, warning]);
      failCount += 1;
      return;
    }

    const { getPointAtDistance, path, startDistance = 0 } = pathData;

    let startPoint;
    try {
      startPoint = getPointAtDistance(startDistance);
      if (!startPoint || typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number') {
        throw new Error('Invalid startPoint');
      }
    } catch (err) {
      const warning = `❌ Failed to compute start point for ${horse.name}`;
      warn(warning, err);
      setRaceWarnings((prev) => [...prev, warning]);
      failCount += 1;
      return;
    }

    const preview = getPointAtDistance(Math.min(startDistance + 1, pathData.arcLength));
    const angle = Math.atan2(preview.y - startPoint.y, preview.x - startPoint.x);

    const sprite = drawHorseSprite(horse.saddleHex, horse.bodyHex, app);
    sprite.anchor.set(0.5);
    sprite.rotation = angle;
    sprite.x = startPoint.x;
    sprite.y = startPoint.y;
    sprite.zIndex = 10;

    if (placeInStaging) {
      const stagingPoint = stagingByLocalId.get(horse.localId);
      if (stagingPoint) {
        sprite.x = stagingArea.x + stagingPoint.x + (stagingPoint.size / 2);
        sprite.y = stagingArea.y + stagingPoint.y + (stagingPoint.size / 2);
      }
    }

    sprite.__raceStartPose = {
      x: startPoint.x,
      y: startPoint.y,
      rotation: angle
    };

    app.stage.addChild(sprite);
    horseSpritesRef.current.set(key, sprite);

    const label = new Text(horse.name, new TextStyle({
      fill: '#111111',
      fontSize: 12,
      fontWeight: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2
    }));

    label.anchor.set(0.5);
    label.x = sprite.x;
    label.y = sprite.y - 20;
    label.zIndex = 12;
    labelSpritesRef.current.set(key, label);
    app.stage.addChild(label);

    if (debugVisible) {
      const debugDot = new Graphics();
      debugDot.beginFill(parseInt(horse.saddleHex.replace('#', ''), 16))
        .drawCircle(0, 0, 4)
        .endFill();
      debugDot.position.set(sprite.x, sprite.y);
      debugDot.zIndex = 5;
      app.stage.addChild(debugDot);
      debugDotsRef.current.push(debugDot);
    }

    const line = new Graphics();
    line.lineStyle(1, parseInt(horse.saddleHex.replace('#', ''), 16), 0.6);
    path.forEach((pt, i) => {
      if (i === 0) line.moveTo(pt.x, pt.y);
      else line.lineTo(pt.x, pt.y);
    });
    line.zIndex = 1;
    debugPathLinesRef.current.push(line);
    if (debugVisible) app.stage.addChild(line);

    successCount += 1;
  });

  if (successCount === 0) {
    const msg = '❌ No horses were placed — all failed during setup';
    warn(msg);
    setRaceWarnings((prev) => [...prev, msg]);
  }

  log(`✅ setupHorses(): placed ${successCount}, failed ${failCount}`);
}

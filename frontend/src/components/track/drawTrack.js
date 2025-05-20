// File: frontend/src/components/track/drawTrack.js
// Version: v1.9.2 — Adds red dot at true canvas 12 o’clock anchor and delta log

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';

export function drawDerbyTrack({
  app,
  width,
  height,
  cornerRadius,
  laneCount,
  laneWidth,
  boundaryPadding = 0,
  trackPadding = 0,
  debug = false,
  startLineOffset = 0
}) {
  const trackContainer = new Graphics();
  const totalLaneWidth = (laneWidth * laneCount) + 2 * boundaryPadding;
  const halfTrack = totalLaneWidth / 2;

  const centerline = generateCenterline({
    canvasWidth: app.view.width,
    canvasHeight: app.view.height,
    totalLaneWidth,
    cornerRadius,
    trackPadding,
    trackHeight: height
  });

  const pathLength = centerline.length;
  const getPointAtDistance = centerline.getPointAtDistance;
  const getCurveFactorAt = centerline.getCurveFactorAt;

  if (!Array.isArray(centerline.path) || centerline.path.length < 2) {
    console.error('[KD] ❌ drawDerbyTrack: Invalid centerline path:', centerline);
    return null;
  }

  const centerlineStart = centerline.path[0];
  const expectedAnchor = {
    x: app.view.width / 2,
    y: (app.view.height - height) / 2 - cornerRadius
  };
  const dx = centerlineStart.x - expectedAnchor.x;
  const dy = centerlineStart.y - expectedAnchor.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  console.log(`[KD] 📌 Reference 12 o’clock anchor: (${expectedAnchor.x.toFixed(1)}, ${expectedAnchor.y.toFixed(1)})`);
  console.log(`[KD] 🎯 centerline[0]: (${centerlineStart.x.toFixed(1)}, ${centerlineStart.y.toFixed(1)}) → Δ=${dist.toFixed(2)}px`);

  const twelveOclockRef = centerlineStart;
  const lanes = generateAllLanes(centerline.path, laneCount, laneWidth, boundaryPadding, twelveOclockRef);
  const inner = generateOffsetLane(centerline.path, -halfTrack, twelveOclockRef);
  const outer = generateOffsetLane(centerline.path, +halfTrack, twelveOclockRef);

  if (!lanes?.length || !inner?.length || !outer?.length) {
    console.error('[KD] ❌ Invalid track geometry.');
    return null;
  }

  trackContainer.beginFill(0xc49a6c);
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  inner.slice().reverse().forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  trackContainer.endFill();

  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => {
    if (i === 0) trackContainer.moveTo(pt.x, pt.y);
    else trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(outer[0].x, outer[0].y);

  inner.forEach((pt, i) => {
    if (i === 0) trackContainer.moveTo(pt.x, pt.y);
    else trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(inner[0].x, inner[0].y);

  if (debug) {
    trackContainer.lineStyle(1, 0x00ff00, 0.5);
    centerline.path.forEach((pt, i) => {
      if (i === 0) trackContainer.moveTo(pt.x, pt.y);
      else trackContainer.lineTo(pt.x, pt.y);
    });
    trackContainer.lineTo(centerline.path[0].x, centerline.path[0].y);
  }

  const startPt = centerline.getPointAtDistance(startLineOffset);
  const normal = { x: -Math.sin(startPt.rotation), y: Math.cos(startPt.rotation) };
  const lineLength = totalLaneWidth;

  const startA = {
    x: startPt.x + normal.x * (lineLength / 2),
    y: startPt.y + normal.y * (lineLength / 2)
  };
  const startB = {
    x: startPt.x - normal.x * (lineLength / 2),
    y: startPt.y - normal.y * (lineLength / 2)
  };

  const startLine = new Graphics();
  startLine.lineStyle(4, 0x00ff00);
  startLine.moveTo(startA.x, startA.y);
  startLine.lineTo(startB.x, startB.y);
  startLine.zIndex = 100;
  app.stage.addChild(startLine);

  const blueDot = new Graphics();
  blueDot.beginFill(0x0000ff).drawCircle(0, 0, 5).endFill();
  blueDot.position.set(centerlineStart.x, centerlineStart.y);
  blueDot.zIndex = 101;
  app.stage.addChild(blueDot);

  const redDot = new Graphics();
  redDot.beginFill(0xff0000).drawCircle(0, 0, 5).endFill();
  redDot.position.set(expectedAnchor.x, expectedAnchor.y);
  redDot.zIndex = 102;
  app.stage.addChild(redDot);

  const innerDot = new Graphics();
  innerDot.beginFill(0xffa500).drawCircle(0, 0, 4).endFill();
  innerDot.position.set(inner[0].x, inner[0].y);
  innerDot.zIndex = 100;
  app.stage.addChild(innerDot);

  const outerDot = new Graphics();
  outerDot.beginFill(0xffa500).drawCircle(0, 0, 4).endFill();
  outerDot.position.set(outer[0].x, outer[0].y);
  outerDot.zIndex = 100;
  app.stage.addChild(outerDot);

  console.log(`[KD] 🟢 Start line drawn at arc 0 → (${startA.x.toFixed(1)}, ${startA.y.toFixed(1)}) to (${startB.x.toFixed(1)}, ${startB.y.toFixed(1)})`);

  app.stage.addChild(trackContainer);

  return {
    lanes,
    centerline,
    getPointAtDistance,
    getCurveFactorAt,
    pathLength
  };
}

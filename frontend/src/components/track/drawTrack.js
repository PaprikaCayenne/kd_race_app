// File: frontend/src/components/track/drawTrack.js
// Version: v1.6.3 — Preserves full centerline object with arc metadata

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
  startAtPercent = 0
}) {
  const trackContainer = new Graphics();
  const totalLaneWidth = (laneWidth * laneCount) + 2 * boundaryPadding;
  const halfTrack = totalLaneWidth / 2;

  // ✅ Preserve full centerline object
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

  // ✅ Guard: Ensure centerline is valid
  if (!Array.isArray(centerline.path) || centerline.path.length < 2) {
    console.error('[KD] ❌ drawDerbyTrack: Invalid centerline path:', centerline);
    return null;
  }

  const lanes = generateAllLanes(centerline.path, laneCount, laneWidth, boundaryPadding);

  if (!Array.isArray(lanes) || lanes.length !== laneCount || lanes.some(l => !Array.isArray(l) || l.length < 2)) {
    console.error('[KD] ❌ drawDerbyTrack: Invalid lanes structure:', lanes);
    return null;
  }

  const inner = generateOffsetLane(centerline.path, -halfTrack);
  const outer = generateOffsetLane(centerline.path, +halfTrack);

  if (!Array.isArray(inner) || inner.length < 2) {
    console.error('[KD] ❌ Invalid inner lane generated:', inner);
    return null;
  }

  if (!Array.isArray(outer) || outer.length < 2) {
    console.error('[KD] ❌ Invalid outer lane generated:', outer);
    return null;
  }

  // Draw track shape
  trackContainer.beginFill(0xc49a6c);
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  inner.slice().reverse().forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  trackContainer.endFill();

  // Draw outer and inner outlines
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

  // Optional centerline for debug
  if (debug) {
    trackContainer.lineStyle(1, 0x00ff00, 0.5);
    centerline.path.forEach((pt, i) => {
      if (i === 0) trackContainer.moveTo(pt.x, pt.y);
      else trackContainer.lineTo(pt.x, pt.y);
    });
    trackContainer.lineTo(centerline.path[0].x, centerline.path[0].y);
  }

  // ✅ Draw start line at arc-distance location
  const startDist = startAtPercent * centerline.totalArcLength;
  const { x, y, rotation } = centerline.getPointAtDistance(startDist);
  const normal = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  const lineLength = totalLaneWidth;

  const startA = {
    x: x + normal.x * (lineLength / 2),
    y: y + normal.y * (lineLength / 2)
  };
  const startB = {
    x: x - normal.x * (lineLength / 2),
    y: y - normal.y * (lineLength / 2)
  };

  const startLine = new Graphics();
  startLine.lineStyle(4, 0x00ff00);
  startLine.moveTo(startA.x, startA.y);
  startLine.lineTo(startB.x, startB.y);
  startLine.zIndex = 100;
  app.stage.addChild(startLine);

  console.log(`[KD] 🟢 Start line at ${Math.round(startAtPercent * 100)}% → from (${startA.x.toFixed(1)}, ${startA.y.toFixed(1)}) to (${startB.x.toFixed(1)}, ${startB.y.toFixed(1)})`);

  app.stage.addChild(trackContainer);

  return {
    lanes,
    centerline, // ✅ now includes arc methods
    getPointAtDistance,
    getCurveFactorAt,
    pathLength
  };
}

// File: frontend/src/components/track/drawTrack.js
// Version: v1.6.1 — Adds guards for inner/outer lane arrays to prevent crash on invalid offset lanes

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';

/**
 * Draws the full race track using vector-based geometry.
 */
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

  // Generate centerline + arc projection utils
  const centerlineData = generateCenterline({
    canvasWidth: app.view.width,
    canvasHeight: app.view.height,
    totalLaneWidth,
    cornerRadius,
    trackPadding,
    trackHeight: height
  });

  const centerline = centerlineData.path;
  const getPointAtDistance = centerlineData.getPointAtDistance;
  const getCurveFactorAt = centerlineData.getCurveFactorAt;
  const pathLength = centerlineData.length;

  // Generate all lanes
  const lanes = generateAllLanes(centerline, laneCount, laneWidth, boundaryPadding);
  const inner = generateOffsetLane(centerline, -halfTrack);
  const outer = generateOffsetLane(centerline, +halfTrack);

  // ✅ Guard: Ensure inner and outer lanes are valid
  if (!Array.isArray(inner) || inner.length < 2) {
    console.error('[KD] ❌ Invalid inner lane generated:', inner);
    return { lanes: [], centerline, getPointAtDistance, getCurveFactorAt, pathLength };
  }

  if (!Array.isArray(outer) || outer.length < 2) {
    console.error('[KD] ❌ Invalid outer lane generated:', outer);
    return { lanes: [], centerline, getPointAtDistance, getCurveFactorAt, pathLength };
  }

  // Fill the track surface
  trackContainer.beginFill(0xc49a6c);
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  inner.slice().reverse().forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  trackContainer.endFill();

  // Outer boundary line
  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => {
    if (i === 0) trackContainer.moveTo(pt.x, pt.y);
    else trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(outer[0].x, outer[0].y);

  // Inner boundary line
  inner.forEach((pt, i) => {
    if (i === 0) trackContainer.moveTo(pt.x, pt.y);
    else trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(inner[0].x, inner[0].y);

  // Optional centerline
  if (debug) {
    trackContainer.lineStyle(1, 0x00ff00, 0.5);
    centerline.forEach((pt, i) => {
      if (i === 0) trackContainer.moveTo(pt.x, pt.y);
      else trackContainer.lineTo(pt.x, pt.y);
    });
    trackContainer.lineTo(centerline[0].x, centerline[0].y);
  }

  // Draw start line at specified arc percent
  const startDist = startAtPercent * pathLength;
  const { x, y, rotation } = getPointAtDistance(startDist);
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
    centerline,
    getPointAtDistance,
    getCurveFactorAt,
    pathLength
  };
}

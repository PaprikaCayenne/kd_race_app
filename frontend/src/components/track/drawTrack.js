// File: frontend/src/components/track/drawTrack.js
// Version: v2.0.7 — Finalized polygon fill fix with working 12 o'clock arc start

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
    canvasWidth: width,
    canvasHeight: height + 2 * trackPadding,
    trackHeight: height,
    totalLaneWidth,
    cornerRadius,
    trackPadding
  });

  const { path, getPointAtDistance, getCurveFactorAt, length: pathLength } = centerline;

  if (!Array.isArray(path) || path.length < 2) {
    console.error('[KD] ❌ drawDerbyTrack: Invalid centerline path:', centerline);
    return null;
  }

  const expectedTop = {
    x: width / 2,
    y: (height + 2 * trackPadding) / 2 - height / 2 + cornerRadius
  };
  const dx = path[0].x - expectedTop.x;
  const dy = path[0].y - expectedTop.y;
  const delta = Math.sqrt(dx * dx + dy * dy);
  console.log(`[KD] 🎯 centerline[0]: (${path[0].x.toFixed(1)}, ${path[0].y.toFixed(1)}) vs expected (${expectedTop.x.toFixed(1)}, ${expectedTop.y.toFixed(1)}) → Δ=${delta.toFixed(2)}px`);

  const lanes = generateAllLanes(path, laneCount, laneWidth, boundaryPadding, path[0]);
  const inner = generateOffsetLane(path, -halfTrack, path[0]);
  const outer = generateOffsetLane(path, +halfTrack, path[0]);

  if (!lanes?.length || !inner?.length || !outer?.length) {
    console.error('[KD] ❌ Invalid offset lanes.');
    return null;
  }

  // ✅ Proper polygon fill: clockwise outer + reversed inner, flattened as number array
  const fillPolygon = [
    ...outer.flatMap(pt => [pt.x, pt.y]),
    ...inner.slice().reverse().flatMap(pt => [pt.x, pt.y])
  ];

  trackContainer.beginFill(0xc49a6c);
  trackContainer.drawPolygon(fillPolygon);
  trackContainer.endFill();

  // 🧱 Track borders
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

  // 🟩 Centerline path (optional)
  if (debug) {
    trackContainer.lineStyle(1, 0x00ff00, 0.6);
    path.forEach((pt, i) => {
      if (i === 0) trackContainer.moveTo(pt.x, pt.y);
      else trackContainer.lineTo(pt.x, pt.y);
    });
    trackContainer.lineTo(path[0].x, path[0].y);
  }

  // 🟢 Start line at arc 0
  const startPt = getPointAtDistance(startLineOffset);
  const normal = { x: -Math.sin(startPt.rotation), y: Math.cos(startPt.rotation) };
  const halfLine = totalLaneWidth / 2;
  const startA = {
    x: startPt.x + normal.x * halfLine,
    y: startPt.y + normal.y * halfLine
  };
  const startB = {
    x: startPt.x - normal.x * halfLine,
    y: startPt.y - normal.y * halfLine
  };

  const startLine = new Graphics();
  startLine.lineStyle(4, 0x00ff00);
  startLine.moveTo(startA.x, startA.y);
  startLine.lineTo(startB.x, startB.y);
  startLine.zIndex = 100;
  app.stage.addChild(startLine);

  // 🔵 Optional debug anchor dots
  if (debug) {
    const blueDot = new Graphics();
    blueDot.beginFill(0x0000ff).drawCircle(0, 0, 5).endFill();
    blueDot.position.set(path[0].x, path[0].y);
    blueDot.zIndex = 101;
    app.stage.addChild(blueDot);

    const redDot = new Graphics();
    redDot.beginFill(0xff0000).drawCircle(0, 0, 5).endFill();
    redDot.position.set(expectedTop.x, expectedTop.y);
    redDot.zIndex = 102;
    app.stage.addChild(redDot);
  }

  app.stage.addChild(trackContainer);

  return {
    lanes,
    centerline,
    getPointAtDistance,
    getCurveFactorAt,
    pathLength
  };
}

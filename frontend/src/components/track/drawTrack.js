// File: frontend/src/components/track/drawTrack.js
// Version: v2.1.1 — Fixes brown fill seam at 12 o’clock, full debug alignment

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';
import parseColorToHex from '@/utils/parseColorToHex';

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
  startLineOffset = 0,
  horses = [],
  debugDotsRef,
  debugPathLinesRef,
  labelSpritesRef
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
    y: trackPadding + cornerRadius
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

  // 🧵 DEBUG: Check polygon closure delta
  const gapDx = outer[0].x - inner.at(-1).x;
  const gapDy = outer[0].y - inner.at(-1).y;
  const gapDelta = Math.sqrt(gapDx * gapDx + gapDy * gapDy);
  console.log(`[KD] 🔍 Fill seam gap Δ = ${gapDelta.toFixed(2)}px between outer[0] and inner[-1]`);

  // 🎨 Fill polygon — force close
  const fillOuter = [...outer, outer[0]];
  const fillInner = [...inner].reverse();
  fillInner.push(fillInner[0]); // force closure

  const fillPolygon = [
    ...fillOuter.flatMap(pt => [pt.x, pt.y]),
    ...fillInner.flatMap(pt => [pt.x, pt.y])
  ];

  trackContainer.beginFill(0xc49a6c);
  trackContainer.drawPolygon(fillPolygon);
  trackContainer.endFill();

  // 🧱 Border lines
  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);

  inner.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(inner[0].x, inner[0].y);

  app.stage.addChild(trackContainer);

  // 🟢 Start line (green)
  const seg0 = path[0];
  const seg1 = path[1];
  const rotation = Math.atan2(seg1.y - seg0.y, seg1.x - seg0.x);
  const normal = { x: -Math.sin(rotation), y: Math.cos(rotation) };
  const halfLine = totalLaneWidth / 2;
  const startA = {
    x: seg0.x + normal.x * halfLine,
    y: seg0.y + normal.y * halfLine
  };
  const startB = {
    x: seg0.x - normal.x * halfLine,
    y: seg0.y - normal.y * halfLine
  };

  const startLine = new Graphics();
  startLine.lineStyle(4, 0x00ff00);
  startLine.moveTo(startA.x, startA.y);
  startLine.lineTo(startB.x, startB.y);
  startLine.zIndex = 100;
  app.stage.addChild(startLine);

  // 🔍 Debug overlays
  if (debug) {
    const centerlineGraphic = new Graphics();
    centerlineGraphic.lineStyle(1, 0x000000, 0.8);
    path.forEach((pt, i) => i === 0 ? centerlineGraphic.moveTo(pt.x, pt.y) : centerlineGraphic.lineTo(pt.x, pt.y));
    centerlineGraphic.lineTo(path[0].x, path[0].y);
    app.stage.addChild(centerlineGraphic);
    debugPathLinesRef.current.push(centerlineGraphic);

    const addDot = (x, y, color) => {
      const dot = new Graphics();
      dot.beginFill(color).drawCircle(0, 0, 5).endFill();
      dot.position.set(x, y);
      dot.zIndex = 101;
      app.stage.addChild(dot);
      debugDotsRef.current.push(dot);
    };

    addDot(path[0].x, path[0].y, 0x0000ff);
    addDot(expectedTop.x, expectedTop.y, 0xff0000);
    addDot(inner[0].x, inner[0].y, 0xff9900);
    addDot(outer[0].x, outer[0].y, 0xff9900);

    horses.slice(0, laneCount).forEach((horse, i) => {
      const lanePath = lanes[i];
      const colorHex = parseColorToHex(horse.color);
      const laneLine = new Graphics();
      laneLine.lineStyle(2, colorHex, 1);
      lanePath.forEach((pt, j) => j === 0 ? laneLine.moveTo(pt.x, pt.y) : laneLine.lineTo(pt.x, pt.y));
      app.stage.addChild(laneLine);
      debugPathLinesRef.current.push(laneLine);
    });
  }

  return {
    lanes,
    centerline,
    getPointAtDistance,
    getCurveFactorAt,
    pathLength
  };
}

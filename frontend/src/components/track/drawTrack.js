// File: frontend/src/components/track/drawTrack.js
// Version: v2.2.0 — Adds debug dots for trueFinish, driftEnd, and driftStart per horse

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
  horsePaths = new Map(),
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
  if (!Array.isArray(path) || path.length < 2) return null;

  const expectedTop = {
    x: width / 2,
    y: trackPadding + cornerRadius
  };
  const dx = path[0].x - expectedTop.x;
  const dy = path[0].y - expectedTop.y;
  console.log(`[KD] 🎯 centerline[0]: (${path[0].x.toFixed(1)}, ${path[0].y.toFixed(1)}) vs expected (${expectedTop.x.toFixed(1)}, ${expectedTop.y.toFixed(1)}) → Δ=${Math.sqrt(dx * dx + dy * dy).toFixed(2)}px`);

  const lanes = generateAllLanes(path, laneCount, laneWidth, boundaryPadding, path[0]);
  const inner = generateOffsetLane(path, -halfTrack, path[0]);
  const outer = generateOffsetLane(path, +halfTrack, path[0]);

  // 🎨 Fill polygon track
  const fillOuter = [...outer, outer[0]];
  const fillInner = [...inner].reverse();
  fillInner.push(fillInner[0]);

  trackContainer.beginFill(0xc49a6c);
  trackContainer.drawPolygon([
    ...fillOuter.flatMap(pt => [pt.x, pt.y]),
    ...fillInner.flatMap(pt => [pt.x, pt.y])
  ]);
  trackContainer.endFill();

  // 🧱 Border lines
  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  inner.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(inner[0].x, inner[0].y);
  app.stage.addChild(trackContainer);

  // 🟢 Start line
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

    // 🟣 🟦 🔴 Finish, Drift, and Start Dots
    horses.forEach((horse) => {
      const pathData = horsePaths.get(horse.id);
      if (!pathData) return;

      const colorHex = parseColorToHex(horse.color);
      const { trueFinish, driftEnd } = pathData;
      const driftStart = pathData.getPointAtDistance(pathData.arcLength); // purple = start of drift

      if (trueFinish) addDot(trueFinish.x, trueFinish.y, 0x0000ff); // 🔵 Blue = true finish
      if (driftEnd) addDot(driftEnd.x, driftEnd.y, 0xff0000);       // 🔴 Red = drift end
      if (driftStart) addDot(driftStart.x, driftStart.y, 0x9900cc); // 🟣 Purple = drift start
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

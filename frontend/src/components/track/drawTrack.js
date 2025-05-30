// File: frontend/src/components/track/drawTrack.js
// Version: v2.6.1 — Finish line now uses spriteWidth/2 position
// Date: 2025-05-29

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';
import { drawStartLine } from './drawStartLine';
import { drawFinishLine } from './drawFinishLine';

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
  spriteWidth = 0,
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

  const { path } = centerline;
  if (!Array.isArray(path) || path.length < 2) return null;

  const lanes = generateAllLanes(path, laneCount, laneWidth, boundaryPadding, path[0]);
  const inner = generateOffsetLane(path, -halfTrack, path[0]);
  const outer = generateOffsetLane(path, +halfTrack, path[0]);

  const fillOuter = [...outer, outer[0]];
  const fillInner = [...inner].reverse();
  fillInner.push(fillInner[0]);

  trackContainer.beginFill(0xc49a6c);
  trackContainer.drawPolygon([
    ...fillOuter.flatMap(pt => [pt.x, pt.y]),
    ...fillInner.flatMap(pt => [pt.x, pt.y])
  ]);
  trackContainer.endFill();

  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  inner.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(inner[0].x, inner[0].y);
  app.stage.addChild(trackContainer);

  const startLine = drawStartLine({
    app,
    centerline,
    laneCount,
    laneWidth,
    boundaryPadding,
    startLineOffset,
    spriteWidth
  });

  const finishLine = drawFinishLine({
    app,
    centerline,
    laneCount,
    laneWidth,
    boundaryPadding,
    spriteWidth,
    delayMs: 5000
  });

  if (debug) {
    const centerlineGraphic = new Graphics();
    centerlineGraphic.lineStyle(1, 0x000000, 0.8);
    path.forEach((pt, i) => i === 0 ? centerlineGraphic.moveTo(pt.x, pt.y) : centerlineGraphic.lineTo(pt.x, pt.y));
    centerlineGraphic.lineTo(path[0].x, path[0].y);
    app.stage.addChild(centerlineGraphic);
    debugPathLinesRef.current.push(centerlineGraphic);
  }

  return {
    lanes,
    centerline,
    startLine,
    finishLine
  };
}

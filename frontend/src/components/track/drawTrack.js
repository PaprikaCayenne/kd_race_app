// File: frontend/src/components/track/drawTrack.js
// Version: v3.0.0 — Exports explicit dirt-ring, inner-hole, and panel-safe bounds for overlay logic
// Date: 2026-02-19

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';
import { drawStartLine } from './drawStartLine';
import { drawFinishLine } from './drawFinishLine';

function getBounds(points = []) {
  if (!Array.isArray(points) || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const pt of points) {
    if (typeof pt?.x !== 'number' || typeof pt?.y !== 'number') continue;
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    right: maxX,
    bottom: maxY
  };
}

function insetRect(rect, padding) {
  const pad = Math.max(0, Number(padding) || 0);
  const width = Math.max(0, rect.width - pad * 2);
  const height = Math.max(0, rect.height - pad * 2);

  return {
    x: rect.x + pad,
    y: rect.y + pad,
    width,
    height,
    right: rect.x + pad + width,
    bottom: rect.y + pad + height
  };
}

function clampRect(rect, canvasWidth, canvasHeight, minWidth = 120, minHeight = 80, outerPadding = 12) {
  const x = Math.max(outerPadding, Math.min(rect.x, canvasWidth - outerPadding - minWidth));
  const y = Math.max(outerPadding, Math.min(rect.y, canvasHeight - outerPadding - minHeight));
  const width = Math.max(minWidth, Math.min(rect.width, canvasWidth - x - outerPadding));
  const height = Math.max(minHeight, Math.min(rect.height, canvasHeight - y - outerPadding));

  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height
  };
}

export function drawDerbyTrack({
  app,
  width,
  height,
  cornerRadius,
  laneCount,
  laneWidth,
  boundaryPadding = 0,
  trackPadding = 0,
  horizontalPadding = trackPadding,
  debug = false,
  startLineOffset = 0,
  spriteWidth = 0,
  debugPathLinesRef
}) {
  const trackContainer = new Graphics();
  const totalLaneWidth = (laneWidth * laneCount) + 2 * boundaryPadding;
  const halfTrack = totalLaneWidth / 2;

  const centerline = generateCenterline({
    canvasWidth: width,
    canvasHeight: app.screen.height,
    trackHeight: height,
    totalLaneWidth,
    cornerRadius,
    trackPadding,
    horizontalPadding
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
    ...fillOuter.flatMap((pt) => [pt.x, pt.y]),
    ...fillInner.flatMap((pt) => [pt.x, pt.y])
  ]);
  trackContainer.endFill();

  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  inner.forEach((pt, i) => i === 0 ? trackContainer.moveTo(pt.x, pt.y) : trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(inner[0].x, inner[0].y);
  trackContainer.zIndex = 0;
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
    startLineOffset,
    spriteWidth
  });

  if (debug) {
    const centerlineGraphic = new Graphics();
    centerlineGraphic.lineStyle(1, 0x000000, 0.8);
    path.forEach((pt, i) => i === 0 ? centerlineGraphic.moveTo(pt.x, pt.y) : centerlineGraphic.lineTo(pt.x, pt.y));
    centerlineGraphic.lineTo(path[0].x, path[0].y);
    app.stage.addChild(centerlineGraphic);
    debugPathLinesRef.current.push(centerlineGraphic);
  }

  const canvasBounds = {
    x: 0,
    y: 0,
    width: app.screen.width,
    height: app.screen.height,
    right: app.screen.width,
    bottom: app.screen.height
  };

  const trackViewportBounds = {
    x: horizontalPadding,
    y: trackPadding,
    width: Math.max(0, width - (horizontalPadding * 2)),
    height: Math.max(0, app.screen.height - trackPadding),
    right: Math.max(0, width - horizontalPadding),
    bottom: app.screen.height
  };

  // Brown dirt + gray border ring outer envelope.
  const trackRingBounds = getBounds(outer);
  // Green infield hole envelope inside the ring.
  const infieldHoleBounds = getBounds(inner);
  // Safe rectangle for overlays inside the infield hole.
  const panelSafeBounds = clampRect(
    insetRect(infieldHoleBounds, Math.max(14, laneWidth * 0.85)),
    app.screen.width,
    app.screen.height,
    260,
    170,
    16
  );

  const bottomPadding = 16;
  const belowTrackSpace = Math.max(108, app.screen.height - trackRingBounds.bottom - bottomPadding * 2);
  const penHeight = Math.max(108, Math.min(164, belowTrackSpace));
  const penWidth = Math.max(190, Math.min(310, app.screen.width * 0.24));
  const penY = Math.max(trackRingBounds.bottom + 10, app.screen.height - penHeight - bottomPadding);

  const penBounds = clampRect({
    x: 16,
    y: penY,
    width: penWidth,
    height: penHeight,
    right: 16 + penWidth,
    bottom: penY + penHeight
  }, app.screen.width, app.screen.height, 170, 100, 12);

  const winnersPenBounds = clampRect({
    x: app.screen.width - penWidth - 16,
    y: penY,
    width: penWidth,
    height: penHeight,
    right: app.screen.width - 16,
    bottom: penY + penHeight
  }, app.screen.width, app.screen.height, 170, 100, 12);

  return {
    lanes,
    centerline,
    startLine,
    finishLine,
    trackBounds: trackRingBounds,
    trackRingBounds,
    infieldBounds: panelSafeBounds,
    infieldHoleBounds,
    panelSafeBounds,
    penBounds,
    winnersPenBounds,
    canvasBounds,
    trackViewportBounds
  };
}

// File: frontend/src/components/track/drawTrack.js
// Version: v3.0.0 — Exports explicit dirt-ring, inner-hole, and panel-safe bounds for overlay logic
// Date: 2026-02-19

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';
import { drawStartLine } from './drawStartLine';
import { drawFinishLine } from './drawFinishLine';
import { computeRaceLayout } from './computeRaceLayout';

function rectArea(rect) {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function mergeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
    right,
    bottom
  };
}

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

  const innerCandidateBounds = getBounds(inner);
  const outerCandidateBounds = getBounds(outer);
  // Use merged envelope so naming/sign does not affect true outer ring bounds.
  const trackRingBounds = mergeRect(innerCandidateBounds, outerCandidateBounds);
  // Choose smaller envelope as the infield hole candidate.
  const infieldHoleBounds = rectArea(innerCandidateBounds) <= rectArea(outerCandidateBounds)
    ? innerCandidateBounds
    : outerCandidateBounds;
  const layout = computeRaceLayout({
    canvasWidth: app.screen.width,
    canvasHeight: app.screen.height,
    laneWidth,
    trackRingBounds,
    infieldHoleBounds
  });

  return {
    lanes,
    centerline,
    startLine,
    finishLine,
    trackBounds: trackRingBounds,
    trackRingBounds,
    infieldBounds: layout.panelSafeBounds,
    infieldHoleBounds,
    panelSafeBounds: layout.panelSafeBounds,
    overlayBounds: layout.overlayBounds,
    penBounds: layout.penBounds,
    winnersPenBounds: layout.winnersPenBounds,
    layoutChecks: layout.checks,
    canvasBounds,
    trackViewportBounds
  };
}

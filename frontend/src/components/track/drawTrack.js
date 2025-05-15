// File: frontend/src/components/track/drawTrack.js
// Version: v1.4.2 — Uses separate trackHeight to center vertically in canvas

import { Graphics } from 'pixi.js';
import { generateCenterline } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes, generateOffsetLane } from '@/utils/generateOffsetLane';

/**
 * Draws the full race track using vector-based math.
 */
export function drawDerbyTrack({
  app,
  width,
  height,               // trackHeight only, not full canvas
  cornerRadius,
  laneCount,
  laneWidth,
  boundaryPadding = 0,
  trackPadding = 0,
  debug = false
}) {
  const trackContainer = new Graphics();

  const totalLaneWidth = (laneWidth * laneCount) + 2 * boundaryPadding;
  const halfTrack = totalLaneWidth / 2;

  const centerline = generateCenterline({
    canvasWidth: app.view.width,
    canvasHeight: app.view.height,   // full canvas height
    totalLaneWidth,
    cornerRadius,
    trackPadding,
    trackHeight: height              // pass actual track height explicitly
  });

  const lanes = generateAllLanes(centerline, laneCount, laneWidth, boundaryPadding);
  const inner = generateOffsetLane(centerline, -halfTrack);
  const outer = generateOffsetLane(centerline, +halfTrack);

  // Fill the track with brown
  trackContainer.beginFill(0xc49a6c);
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  inner.slice().reverse().forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  trackContainer.endFill();

  // Outer boundary
  trackContainer.lineStyle(4, 0x888888);
  outer.forEach((pt, i) => {
    if (i === 0) trackContainer.moveTo(pt.x, pt.y);
    else trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(outer[0].x, outer[0].y);

  // Inner boundary
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

  app.stage.addChild(trackContainer);

  return {
    lanes,
    centerline
  };
}

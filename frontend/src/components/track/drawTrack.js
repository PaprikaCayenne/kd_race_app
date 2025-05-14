// File: frontend/src/components/track/drawTrack.js
// Version: v1.1.0 — Accepts spriteWidth and startAtPercent to support precise lane spacing and path alignment

import { Graphics } from 'pixi.js';
import { generateTrackPathWithRoundedCorners } from '@/utils/generateTrackPathWithRoundedCorners';
import { generateAllLanes } from '@/utils/generateOffsetLane';

export function drawDerbyTrack({ app, width, height, cornerRadius, laneWidth, laneCount, spriteWidth = 40, startAtPercent = 0, debug = false }) {
  const trackContainer = new Graphics();

  const offsetX = (app.view.width - width) / 2;
  const offsetY = (app.view.height - height) / 2;

  // Use spriteWidth + padding to calculate spacing between lanes
  const adjustedLaneWidth = spriteWidth + 2;

  // Generate the master centerline path
  const centerline = generateTrackPathWithRoundedCorners({
    width,
    height,
    cornerRadius,
    segmentsPerCurve: 24,
    offsetX,
    offsetY
  });

  // Generate lane paths offset from centerline
  const lanes = generateAllLanes(centerline, laneCount, adjustedLaneWidth);

  // lanes[0] = innermost lane, lanes[lanes.length - 1] = outermost lane
  const inner = lanes[0];
  const outer = lanes[lanes.length - 1];

  // Fill area between outer and inner boundaries
  trackContainer.beginFill(0xc49a6c); // light brown
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  inner.slice().reverse().forEach(pt => trackContainer.lineTo(pt.x, pt.y));
  trackContainer.lineTo(outer[0].x, outer[0].y);
  trackContainer.endFill();

  // Outer boundary
  trackContainer.lineStyle(4, 0x888888);
  trackContainer.moveTo(outer[0].x, outer[0].y);
  outer.forEach((pt, i) => {
    if (i > 0) trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(outer[0].x, outer[0].y);

  // Inner boundary
  trackContainer.moveTo(inner[0].x, inner[0].y);
  inner.forEach((pt, i) => {
    if (i > 0) trackContainer.lineTo(pt.x, pt.y);
  });
  trackContainer.lineTo(inner[0].x, inner[0].y);

  if (debug) {
    trackContainer.lineStyle(1, 0x00ff00, 0.6);
    trackContainer.moveTo(centerline[0].x, centerline[0].y);
    for (let i = 1; i < centerline.length; i++) {
      trackContainer.lineTo(centerline[i].x, centerline[i].y);
    }
    trackContainer.lineTo(centerline[0].x, centerline[0].y);
  }

  app.stage.addChild(trackContainer);

  // Return geometry for later use
  return { lanes, centerline };
}

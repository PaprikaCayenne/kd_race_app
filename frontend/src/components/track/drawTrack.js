// File: frontend/src/components/track/drawTrack.js
// Version: v1.0.6 — Reduces track width to ~150px, updates to light brown fill

import { Graphics } from 'pixi.js';
import { generateOffsetLanes } from '@/utils/generateOffsetLanes';

export function drawDerbyTrack({ app, width, height, cornerRadius, laneWidth, laneCount, debug = false }) {
  const trackContainer = new Graphics();

  const offsetX = (app.view.width - width) / 2;
  const offsetY = (app.view.height - height) / 2;

  // Override lane width to get approximately 150px track thickness
  const adjustedLaneWidth = 37.5; // 4 lanes * 37.5 = 150px

  const { lanes, centerline } = generateOffsetLanes({
    width,
    height,
    cornerRadius,
    laneWidth: adjustedLaneWidth,
    laneCount,
    offsetX,
    offsetY
  });

  const outer = lanes[0];
  const inner = lanes[lanes.length - 1];

  // Fill area between outer and inner boundaries
  trackContainer.beginFill(0xc49a6c); // light brown (matches earlier track color)
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
  return { lanes, centerline };
}

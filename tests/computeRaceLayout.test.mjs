import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRaceLayout } from '../frontend/src/components/track/computeRaceLayout.js';

test('computeRaceLayout keeps overlay bounds inside panel-safe infield', () => {
  const layout = computeRaceLayout({
    canvasWidth: 1600,
    canvasHeight: 900,
    laneWidth: 44,
    trackRingBounds: { x: 20, y: 24, width: 1560, height: 620, right: 1580, bottom: 644 },
    infieldHoleBounds: { x: 260, y: 180, width: 1080, height: 360, right: 1340, bottom: 540 }
  });

  const { panelSafeBounds, overlayBounds } = layout;
  assert.ok(overlayBounds.leaderboard.left >= panelSafeBounds.x);
  assert.ok((overlayBounds.race.left + overlayBounds.race.width) <= panelSafeBounds.right);
});

test('computeRaceLayout keeps both pens below track ring', () => {
  const layout = computeRaceLayout({
    canvasWidth: 1500,
    canvasHeight: 900,
    laneWidth: 42,
    trackRingBounds: { x: 24, y: 28, width: 1452, height: 610, right: 1476, bottom: 638 },
    infieldHoleBounds: { x: 250, y: 170, width: 1020, height: 340, right: 1270, bottom: 510 }
  });

  assert.ok(layout.penBounds.y >= 648);
  assert.ok(layout.winnersPenBounds.y >= 648);
});


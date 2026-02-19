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

test('computeRaceLayout keeps winner panel and timer sharing infield center anchor', () => {
  const layout = computeRaceLayout({
    canvasWidth: 1440,
    canvasHeight: 900,
    laneWidth: 42,
    trackRingBounds: { x: 20, y: 22, width: 1400, height: 610, right: 1420, bottom: 632 },
    infieldHoleBounds: { x: 250, y: 170, width: 940, height: 350, right: 1190, bottom: 520 }
  });

  const expectedX = Math.round(layout.panelSafeBounds.x + (layout.panelSafeBounds.width / 2));
  const expectedY = Math.round(layout.panelSafeBounds.y + (layout.panelSafeBounds.height / 2));

  assert.equal(layout.centerAnchor.x, expectedX);
  assert.equal(layout.centerAnchor.y, expectedY);
  assert.equal(layout.overlayBounds.winner.left, expectedX);
  assert.equal(layout.overlayBounds.winner.top, expectedY);
});

test('computeRaceLayout keeps both pens below track ring', () => {
  const layout = computeRaceLayout({
    canvasWidth: 1500,
    canvasHeight: 900,
    laneWidth: 42,
    trackRingBounds: { x: 24, y: 28, width: 1452, height: 610, right: 1476, bottom: 638 },
    infieldHoleBounds: { x: 250, y: 170, width: 1020, height: 340, right: 1270, bottom: 510 }
  });

  assert.ok(layout.penBounds.y >= 646);
  assert.ok(layout.winnersPenBounds.y >= 646);
});

test('computeRaceLayout keeps pens visible when track runs low on vertical space', () => {
  const canvasHeight = 900;
  const layout = computeRaceLayout({
    canvasWidth: 1400,
    canvasHeight,
    laneWidth: 42,
    trackRingBounds: { x: 20, y: 20, width: 1360, height: 840, right: 1380, bottom: 860 },
    infieldHoleBounds: { x: 250, y: 210, width: 900, height: 300, right: 1150, bottom: 510 }
  });

  assert.ok(layout.penBounds.bottom <= (canvasHeight - 14));
  assert.ok(layout.winnersPenBounds.bottom <= (canvasHeight - 14));
  assert.equal(layout.checks.pensVisibleWithinCanvas, true);
});

test('computeRaceLayout returns pen sprite sizing hint in expected range', () => {
  const layout = computeRaceLayout({
    canvasWidth: 1366,
    canvasHeight: 900,
    laneWidth: 40,
    trackRingBounds: { x: 20, y: 24, width: 1326, height: 620, right: 1346, bottom: 644 },
    infieldHoleBounds: { x: 220, y: 180, width: 940, height: 330, right: 1160, bottom: 510 }
  });

  assert.ok(layout.horsePenSpriteSize >= 54);
  assert.ok(layout.horsePenSpriteSize <= 86);
});

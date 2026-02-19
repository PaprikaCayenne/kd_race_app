// File: frontend/src/components/track/computeRaceLayout.js
// Version: v1.2.0 — Canonical race layout solver with shared infield center and outer-track pen anchors
// Date: 2026-02-19

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function withEdges(rect) {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  };
}

function insetRect(rect, padding) {
  const pad = Math.max(0, Number(padding) || 0);
  const width = Math.max(0, rect.width - (pad * 2));
  const height = Math.max(0, rect.height - (pad * 2));
  return withEdges({
    x: rect.x + pad,
    y: rect.y + pad,
    width,
    height
  });
}

function clampRect(rect, canvasWidth, canvasHeight, minWidth = 120, minHeight = 80, outerPadding = 12) {
  const boundedWidth = Math.max(minWidth, Math.min(rect.width, canvasWidth - (outerPadding * 2)));
  const boundedHeight = Math.max(minHeight, Math.min(rect.height, canvasHeight - (outerPadding * 2)));

  const x = clamp(rect.x, outerPadding, canvasWidth - outerPadding - boundedWidth);
  const y = clamp(rect.y, outerPadding, canvasHeight - outerPadding - boundedHeight);

  return withEdges({
    x,
    y,
    width: boundedWidth,
    height: boundedHeight
  });
}

export function computeRaceLayout({
  canvasWidth,
  canvasHeight,
  laneWidth,
  trackRingBounds,
  infieldHoleBounds
}) {
  const infieldPanelInset = clamp(Math.round(laneWidth * 0.9), 16, 30);
  const panelSafeBounds = clampRect(
    insetRect(infieldHoleBounds, infieldPanelInset),
    canvasWidth,
    canvasHeight,
    380,
    220,
    16
  );

  const panelInsetX = 10;
  const panelGap = clamp(Math.round(panelSafeBounds.width * 0.02), 10, 20);
  const panelCenterX = Math.round(panelSafeBounds.x + (panelSafeBounds.width / 2));
  const panelCenterY = Math.round(panelSafeBounds.y + (panelSafeBounds.height / 2));

  let leaderboardWidth = clamp(Math.round(panelSafeBounds.width * 0.24), 168, 290);
  let raceWidth = clamp(Math.round(panelSafeBounds.width * 0.23), 168, 300);

  const sideOccupied = leaderboardWidth + raceWidth + (panelGap * 2) + (panelInsetX * 2);
  let centerAvailable = Math.max(130, panelSafeBounds.width - sideOccupied);

  if (centerAvailable < 160) {
    const shortage = 160 - centerAvailable;
    const reduceLeft = Math.min(shortage, Math.max(0, leaderboardWidth - 150));
    leaderboardWidth -= reduceLeft;
    const reduceRight = Math.min(shortage - reduceLeft, Math.max(0, raceWidth - 150));
    raceWidth -= reduceRight;
    centerAvailable = Math.max(130, panelSafeBounds.width - (leaderboardWidth + raceWidth + (panelGap * 2) + (panelInsetX * 2)));
  }

  const winnerWidth = clamp(Math.round(centerAvailable * 0.58), 130, 230);

  const leaderboardHeight = clamp(Math.round(panelSafeBounds.height * 0.74), 300, 430);
  const raceHeight = clamp(Math.round(panelSafeBounds.height * 0.86), 360, 520);
  const winnerHeight = clamp(Math.round(panelSafeBounds.height * 0.62), 220, 340);

  const overlayBounds = {
    leaderboard: {
      left: Math.round(panelSafeBounds.x + panelInsetX),
      top: panelCenterY,
      width: leaderboardWidth,
      maxHeight: leaderboardHeight,
      overflowY: 'hidden',
      transform: 'translateY(-50%)'
    },
    winner: {
      left: panelCenterX,
      top: panelCenterY,
      width: winnerWidth,
      maxHeight: winnerHeight,
      overflow: 'visible',
      transform: 'translate(-50%, -50%)'
    },
    race: {
      left: Math.round(panelSafeBounds.right - raceWidth - panelInsetX),
      top: panelCenterY,
      width: raceWidth,
      maxHeight: raceHeight,
      overflowY: 'hidden',
      transform: 'translateY(-50%)'
    }
  };

  const bottomPadding = 14;
  const minPenHeight = 180;
  const maxPenHeight = 300;

  const preferredPenTop = Math.round(trackRingBounds.bottom + 10);
  const maxVisiblePenTop = Math.max(12, canvasHeight - minPenHeight - bottomPadding);
  const penTop = clamp(preferredPenTop, 12, maxVisiblePenTop);

  const availableBelow = Math.max(minPenHeight, canvasHeight - penTop - bottomPadding);
  const penHeight = clamp(Math.round(availableBelow), minPenHeight, maxPenHeight);

  const outerTrackLeft = clamp(Math.round(trackRingBounds.x), 10, canvasWidth - 220);
  const outerTrackRight = clamp(Math.round(trackRingBounds.right), outerTrackLeft + 280, canvasWidth - 10);

  const winnersPenWidth = clamp(Math.round((outerTrackRight - outerTrackLeft) * 0.26), 210, 330);
  const penGap = 16;

  const winnersPenX = clamp(
    outerTrackRight - winnersPenWidth,
    outerTrackLeft + 230 + penGap,
    canvasWidth - winnersPenWidth - 10
  );

  const horsePenMaxWidth = Math.max(240, winnersPenX - outerTrackLeft - penGap);
  const horsePenTarget = clamp(Math.round((outerTrackRight - outerTrackLeft) * 0.5), 320, 760);
  const penWidth = clamp(horsePenTarget, 240, horsePenMaxWidth);

  const penBounds = withEdges({
    x: outerTrackLeft,
    y: penTop,
    width: penWidth,
    height: penHeight
  });

  const winnersPenHeight = clamp(Math.round(penHeight * 0.92), 170, 250);
  const winnersPenY = clamp(penTop + Math.max(0, penHeight - winnersPenHeight), 12, canvasHeight - winnersPenHeight - bottomPadding);

  const winnersPenBounds = withEdges({
    x: winnersPenX,
    y: winnersPenY,
    width: winnersPenWidth,
    height: winnersPenHeight
  });

  const checks = {
    overlaysInsideInfield:
      overlayBounds.leaderboard.left >= panelSafeBounds.x
      && (overlayBounds.race.left + overlayBounds.race.width) <= panelSafeBounds.right,
    pensBelowTrack:
      penBounds.y >= Math.round(trackRingBounds.bottom + 8)
      && winnersPenBounds.y >= Math.round(trackRingBounds.bottom + 8),
    pensVisibleWithinCanvas:
      penBounds.bottom <= (canvasHeight - bottomPadding)
      && winnersPenBounds.bottom <= (canvasHeight - bottomPadding)
  };

  return {
    panelSafeBounds,
    overlayBounds,
    penBounds,
    winnersPenBounds,
    centerAnchor: { x: panelCenterX, y: panelCenterY },
    horsePenSpriteSize: clamp(Math.round(Math.min(
      (penBounds.width - 14) / 6,
      (penBounds.height - 14) / 3
    )), 54, 86),
    checks
  };
}

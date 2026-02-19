// File: frontend/src/components/track/computeRaceLayout.js
// Version: v1.1.1 — Canonical layout solver with hard pen visibility clamps
// Date: 2026-02-19

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

export function computeRaceLayout({
  canvasWidth,
  canvasHeight,
  laneWidth,
  trackRingBounds,
  infieldHoleBounds
}) {
  const panelSafeBounds = clampRect(
    insetRect(infieldHoleBounds, Math.max(14, laneWidth * 0.85)),
    canvasWidth,
    canvasHeight,
    260,
    170,
    16
  );

  const panelGap = clamp(Math.round(panelSafeBounds.width * 0.02), 10, 18);
  const panelUsableWidth = Math.max(320, panelSafeBounds.width - panelGap * 2 - 20);

  let leaderboardWidth = clamp(Math.round(panelUsableWidth * 0.23), 132, 260);
  let raceWidth = clamp(Math.round(panelUsableWidth * 0.20), 130, 220);
  let winnerWidth = panelUsableWidth - leaderboardWidth - raceWidth - panelGap * 2;

  if (winnerWidth < 210) {
    const shortage = 210 - winnerWidth;
    const giveBackL = Math.min(Math.max(0, leaderboardWidth - 132), Math.ceil(shortage / 2));
    leaderboardWidth -= giveBackL;
    const giveBackR = Math.min(Math.max(0, raceWidth - 130), shortage - giveBackL);
    raceWidth -= giveBackR;
    winnerWidth = panelUsableWidth - leaderboardWidth - raceWidth - panelGap * 2;
  }
  winnerWidth = clamp(Math.round(winnerWidth * 0.4), 130, 240);

  const leaderboardHeight = clamp(Math.round(panelSafeBounds.height * 0.74), 320, 420);
  const raceHeight = clamp(Math.round(panelSafeBounds.height * 0.82), 360, 500);
  const winnerHeight = clamp(Math.round(panelSafeBounds.height * 0.66), 240, 390);

  const centerY = Math.round(panelSafeBounds.y + (panelSafeBounds.height / 2));

  const overlayBounds = {
    leaderboard: {
      left: Math.round(panelSafeBounds.x + 10),
      top: centerY,
      width: leaderboardWidth,
      maxHeight: leaderboardHeight,
      overflowY: 'hidden',
      transform: 'translateY(-50%)'
    },
    winner: {
      left: Math.round(panelSafeBounds.x + (panelSafeBounds.width / 2)),
      top: centerY,
      width: winnerWidth,
      maxHeight: winnerHeight,
      overflow: 'visible',
      transform: 'translate(-50%, -50%)'
    },
    race: {
      left: Math.round(panelSafeBounds.right - raceWidth - 10),
      top: centerY,
      width: raceWidth,
      maxHeight: raceHeight,
      overflowY: 'hidden',
      transform: 'translateY(-50%)'
    }
  };

  const bottomPadding = 14;
  const minPenHeight = 150;
  const preferredPenTop = Math.round(trackRingBounds.bottom + 10);
  const maxVisiblePenTop = Math.max(12, canvasHeight - minPenHeight - bottomPadding);
  const penTop = clamp(preferredPenTop, 12, maxVisiblePenTop);
  const availableBelow = Math.max(minPenHeight, canvasHeight - penTop - bottomPadding);
  const penHeight = Math.min(300, Math.round(availableBelow));

  const penLeft = Math.max(10, Math.round(trackRingBounds.x));
  const winnersPenWidth = clamp(Math.round(canvasWidth * 0.22), 220, 330);
  const penGap = 18;
  const maxHorsePenWidth = Math.max(300, canvasWidth - penLeft - winnersPenWidth - penGap - 14);
  const horsePenTarget = clamp(Math.round(trackRingBounds.width * 0.40), 280, 560);
  const penWidth = Math.min(maxHorsePenWidth, horsePenTarget);

  const penBounds = {
    x: penLeft,
    y: penTop,
    width: penWidth,
    height: penHeight,
    right: penLeft + penWidth,
    bottom: penTop + penHeight
  };

  const winnersPenX = Math.max(10, canvasWidth - winnersPenWidth - 12);
  const winnersMaxHeight = Math.max(minPenHeight, canvasHeight - penTop - bottomPadding);
  const winnersPenHeight = Math.min(clamp(Math.round(penHeight * 0.9), minPenHeight, 240), winnersMaxHeight);
  const winnersPenY = penTop;
  const winnersPenBounds = {
    x: winnersPenX,
    y: winnersPenY,
    width: winnersPenWidth,
    height: winnersPenHeight,
    right: winnersPenX + winnersPenWidth,
    bottom: winnersPenY + winnersPenHeight
  };

  const checks = {
    overlaysInsideInfield:
      overlayBounds.leaderboard.left >= panelSafeBounds.x &&
      (overlayBounds.race.left + overlayBounds.race.width) <= panelSafeBounds.right,
    pensBelowTrack:
      penBounds.y >= Math.round(trackRingBounds.bottom + 10) &&
      winnersPenBounds.y >= Math.round(trackRingBounds.bottom + 10),
    pensVisibleWithinCanvas:
      penBounds.bottom <= (canvasHeight - bottomPadding) &&
      winnersPenBounds.bottom <= (canvasHeight - bottomPadding)
  };

  return {
    panelSafeBounds,
    overlayBounds,
    penBounds,
    winnersPenBounds,
    checks
  };
}

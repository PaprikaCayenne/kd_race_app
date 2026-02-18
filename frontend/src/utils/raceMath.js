export const RACE_SPEED_MULTIPLIER = 4.6;
export const START_LINE_FRONT_GAP_PX = 4;
export const HORSE_LENGTH_PX = 48;
export const POST_FINISH_RUNOUT_LENGTHS = 2;

export function getStartLineDistance(spriteWidth = 0) {
  return Math.max(0, (spriteWidth / 2) + START_LINE_FRONT_GAP_PX);
}

export function getWinningDistance(arcLength, spriteWidth = 0) {
  return Math.max(0, arcLength - (spriteWidth / 2));
}

export function getStopDistance(arcLength, spriteWidth = 0) {
  return getWinningDistance(arcLength, spriteWidth) + (HORSE_LENGTH_PX * POST_FINISH_RUNOUT_LENGTHS);
}

export function sortHorsesByDistance(horses, distanceMap) {
  return [...horses]
    .filter((h) => distanceMap.has(h.localId))
    .map((h) => ({
      id: h.id,
      localId: h.localId,
      name: h.name,
      saddleHex: h.saddleHex,
      bodyHex: h.bodyHex,
      dist: distanceMap.get(h.localId) || 0
    }))
    .sort((a, b) => b.dist - a.dist);
}

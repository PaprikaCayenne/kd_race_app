export const RACE_SPEED_MULTIPLIER = 5.2;
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

export function getNormalizedProgress(distance, arcLength) {
  if (!Number.isFinite(distance) || !Number.isFinite(arcLength) || arcLength <= 0) return 0;
  return Math.max(0, Math.min(1, distance / arcLength));
}

export function sortHorsesByDistance(horses, distanceMap, horsePaths = new Map()) {
  return [...horses]
    .filter((h) => distanceMap.has(h.localId))
    .map((h) => {
      const dist = distanceMap.get(h.localId) || 0;
      const arcLength = horsePaths?.get?.(h.localId)?.arcLength;
      const normalizedProgress = Number.isFinite(arcLength) && arcLength > 0
        ? getNormalizedProgress(dist, arcLength)
        : dist;

      return {
        id: h.id,
        localId: h.localId,
        name: h.name,
        saddleHex: h.saddleHex,
        bodyHex: h.bodyHex,
        dist,
        normalizedProgress
      };
    })
    .sort((a, b) => {
      if (b.normalizedProgress !== a.normalizedProgress) {
        return b.normalizedProgress - a.normalizedProgress;
      }
      return b.dist - a.dist;
    });
}

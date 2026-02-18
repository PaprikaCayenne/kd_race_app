import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStartLineDistance,
  getWinningDistance,
  getStopDistance,
  sortHorsesByDistance,
  START_LINE_FRONT_GAP_PX,
  HORSE_LENGTH_PX
} from '../frontend/src/utils/raceMath.js';

test('start line sits 4px in front of lineup nose', () => {
  const spriteWidth = 40;
  assert.equal(getStartLineDistance(spriteWidth), (spriteWidth / 2) + START_LINE_FRONT_GAP_PX);
});

test('winning and stop distances follow nose-touch + two horse lengths', () => {
  const arcLength = 1200;
  const spriteWidth = 36;
  const winningDistance = getWinningDistance(arcLength, spriteWidth);
  const stopDistance = getStopDistance(arcLength, spriteWidth);

  assert.equal(winningDistance, arcLength - (spriteWidth / 2));
  assert.equal(stopDistance - winningDistance, HORSE_LENGTH_PX * 2);
});

test('sortHorsesByDistance returns live order highest-first', () => {
  const horses = [
    { id: 1, localId: 1, name: 'A' },
    { id: 2, localId: 2, name: 'B' },
    { id: 3, localId: 3, name: 'C' },
    { id: 4, localId: 4, name: 'D' }
  ];
  const distanceMap = new Map([[1, 100], [2, 325], [3, 220], [4, 90]]);
  const ranked = sortHorsesByDistance(horses, distanceMap);
  assert.deepEqual(ranked.map((h) => h.id), [2, 3, 1, 4]);
});

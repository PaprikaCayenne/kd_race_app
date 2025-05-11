// File: api/utils/generateHorsePathWithSpeed.ts
// Version: v0.8.0 — Tangent-offset lanes from centerline with runtime guardrails

import { Point } from '@/types/geometry';

interface HorsePathOptions {
  horseId: string;
  rotatedCenterline: Point[];
  totalHorses: number;
  placement: number;
  spriteRadius?: number;
  spacingPx?: number;
  preStartPadding?: number;
}

export function generateHorsePathWithSpeed({
  horseId,
  rotatedCenterline,
  totalHorses,
  placement,
  spriteRadius = 12,
  spacingPx = 6,
  preStartPadding = 8,
}: HorsePathOptions) {
  const debug: Record<string, any> = {
    version: 'v0.8.0',
    input: { horseId, placement, totalHorses, spriteRadius, spacingPx },
  };

  if (!Array.isArray(rotatedCenterline) || rotatedCenterline.length < 3) {
    throw new Error('generateHorsePathWithSpeed: Invalid centerline path');
  }

  // Compute perpendicular lane offset
  const offsetFromCenter = (placement - (totalHorses - 1) / 2) * (spriteRadius * 2 + spacingPx);
  const preStartOffset = 30; // px behind start line

  const curvedLanePath: Point[] = [];
  let validOffsets = 0;

  for (let i = 0; i < rotatedCenterline.length - 1; i++) {
    const curr = rotatedCenterline[i];
    const next = rotatedCenterline[i + 1];

    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      curvedLanePath.push({ x: curr.x, y: curr.y });
      continue;
    }

    const dirX = dx / len;
    const dirY = dy / len;
    const perpX = -dirY;
    const perpY = dirX;

    // Lateral offset
    const pathPoint = {
      x: curr.x + perpX * offsetFromCenter,
      y: curr.y + perpY * offsetFromCenter,
    };
    curvedLanePath.push(pathPoint);
    validOffsets++;
  }

  // Close path with final point
  curvedLanePath.push({ ...curvedLanePath[0] });

  // Guardrail: validate coverage
  if (validOffsets < rotatedCenterline.length - 2) {
    console.warn(`[KD] ⚠️ generateHorsePathWithSpeed: incomplete offset coverage (valid: ${validOffsets})`);
  }

  // Prepend pre-start padding (from end of lane)
  const pad = Math.min(preStartPadding, curvedLanePath.length - 1);
  const paddedPath: Point[] = [
    ...curvedLanePath.slice(-pad),
    ...curvedLanePath,
  ];

  // Final start point
  const startPoint = paddedPath[0];
  const dirX = paddedPath[1].x - paddedPath[0].x;
  const dirY = paddedPath[1].y - paddedPath[0].y;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const facing = len === 0 ? { x: 1, y: 0 } : { x: dirX / len, y: dirY / len };

  // Guardrail: track width budget
  const estimatedTrackWidth = 120;
  if (Math.abs(offsetFromCenter) > estimatedTrackWidth / 2) {
    console.warn(`[KD] ⚠️ Placement offset (${offsetFromCenter.toFixed(1)}px) exceeds track width (${estimatedTrackWidth}px)`);
  }

  debug.path = {
    laneOffset: offsetFromCenter,
    totalPoints: paddedPath.length,
    padded: pad,
    estimatedTrackWidth,
  };

  console.log(`[KD] 🧪 generateHorsePathWithSpeed.ts v0.8.0 (horseId: ${horseId}, placement: ${placement})`);
  console.log(`[KD] 🐎 startPoint=(${startPoint.x.toFixed(1)}, ${startPoint.y.toFixed(1)})`);
  console.log(`[KD] ↕ offset=${offsetFromCenter.toFixed(1)}px → direction=(${facing.x.toFixed(3)}, ${facing.y.toFixed(3)})`);

  return {
    horseId,
    path: paddedPath,
    startPoint,
    direction: facing,
    debug,
    rotatedCenterline,
  };
}

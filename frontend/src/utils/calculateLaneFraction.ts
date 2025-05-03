// File: shared/utils/calculateLaneFraction.ts
// Version: v0.1.0 — Calculates safe lane spacing between inner and outer bounds with padding

/**
 * Calculates a lane's fractional position between 0 (inner) and 1 (outer)
 * with optional padding to keep horses from hugging the edges.
 *
 * @param laneIndex Index of the horse (0-based)
 * @param total Total number of horses
 * @param paddingPercent How much padding to leave on each side (0.1 = 10%)
 */
export default function calculateLaneFraction(
    laneIndex: number,
    total: number,
    paddingPercent = 0.1
  ): number {
    if (total <= 1) return 0.5;
    const safeRange = 1 - paddingPercent * 2;
    const step = safeRange / (total - 1);
    return paddingPercent + laneIndex * step;
  }
  
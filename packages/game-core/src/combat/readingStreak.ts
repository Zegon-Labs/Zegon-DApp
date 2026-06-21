import { READING } from "../constants/index.js";
import { DuelModifiers } from "../types/index.js";

export function getEffectiveDeadeyeStreak(modifiers?: DuelModifiers): number {
  if (modifiers?.deadeyeStreak != null) {
    return modifiers.deadeyeStreak;
  }
  if (modifiers?.deadeyeThreshold != null && modifiers.deadeyeThreshold <= 85) {
    return 1;
  }
  return READING.DEADEYE_STREAK;
}

/** Maps reading streak to 0–100 for legacy visuals (venda / glitch). */
export function readingStreakToDisplay(
  streak: number,
  deadeyeStreak: number,
): number {
  if (streak >= deadeyeStreak) return 100;
  if (streak === deadeyeStreak - 1 && deadeyeStreak > 1) return 55;
  if (streak >= 1) return 40;
  return 0;
}

export function computeReadingStreakAfter(
  currentStreak: number,
  predictionCorrect: boolean,
  usedSmoke: boolean,
  deadeyeConsumed: boolean,
  plateBlocked = false,
): number {
  if (deadeyeConsumed) return 0;
  if (usedSmoke || !predictionCorrect) return 0;
  if (plateBlocked) return currentStreak;
  return currentStreak + 1;
}

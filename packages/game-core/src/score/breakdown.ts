import { SCORE } from "../constants/index.js";
import {
  dailyStreakMultiplier,
  surpriseComboBonus,
} from "../progression/achievements.js";
import { determineDuelWinner } from "../state/duelStateMachine.js";
import { DuelResult, DuelState, DuelWinner } from "../types/index.js";

export type ScoreBreakdownReason =
  | "rounds_played"
  | "blindsight_penalty"
  | "times_read"
  | "surprise_bonus"
  | "victory"
  | "daily_multiplier";

export interface ScoreBreakdownLine {
  reason: ScoreBreakdownReason;
  points: number;
  count?: number;
  multiplier?: number;
}

export interface ScoreBreakdown {
  lines: ScoreBreakdownLine[];
  subtotal: number;
  total: number;
}

export function buildScoreBreakdown(
  state: DuelState,
  options?: { dailyStreakDays?: number; surpriseStreak?: number },
): ScoreBreakdown {
  const timesRead = state.roundLogs.filter((log) => log.predictionCorrect).length;
  const roundsPlayed = state.roundLogs.length;
  const winner = determineDuelWinner(state);
  const streak = options?.surpriseStreak ?? 0;

  const lines: ScoreBreakdownLine[] = [];

  if (roundsPlayed > 0) {
    lines.push({
      reason: "rounds_played",
      points: roundsPlayed * SCORE.SURVIVED_ROUND,
      count: roundsPlayed,
    });
  }

  const blindsightPenalty = Math.round(
    SCORE.BLINDSIGHT_PENALTY_FACTOR * (100 - state.blindsight),
  );
  if (blindsightPenalty !== 0) {
    lines.push({
      reason: "blindsight_penalty",
      points: blindsightPenalty,
    });
  }

  if (timesRead > 0) {
    lines.push({
      reason: "times_read",
      points: -timesRead * SCORE.TIMES_READ_PENALTY,
      count: timesRead,
    });
  }

  const surprisePer = surpriseComboBonus(streak);
  if (surprisePer > 0 && streak > 1) {
    lines.push({
      reason: "surprise_bonus",
      points: surprisePer * (streak - 1),
      count: streak - 1,
    });
  }

  if (winner === DuelWinner.PLAYER) {
    lines.push({
      reason: "victory",
      points: SCORE.VICTORY_BONUS,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.points, 0);
  const dailyMult = dailyStreakMultiplier(options?.dailyStreakDays ?? 0);
  let total = Math.round(subtotal * dailyMult);

  if (dailyMult > 1) {
    lines.push({
      reason: "daily_multiplier",
      points: total - subtotal,
      multiplier: dailyMult,
    });
  }

  total = Math.max(0, total);

  return { lines, subtotal, total };
}

export function buildScoreBreakdownFromResult(
  result: DuelResult,
  options?: { dailyStreakDays?: number; surpriseStreak?: number },
): ScoreBreakdown {
  const pseudoState = {
    roundLogs: result.roundLogs,
    blindsight: result.finalBlindsight,
    playerHp: result.playerHp,
    zegonHp: result.zegonHp,
    config: { modifiers: {} },
  } as DuelState;
  return buildScoreBreakdown(pseudoState, options);
}

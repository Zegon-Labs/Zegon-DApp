import { SCORE } from "../constants/index.js";
import { dailyStreakMultiplier } from "../progression/achievements.js";
import {
  calculateScoreFromState,
  surpriseStreakBonus,
  timesReadPenalty,
} from "./calculate.js";
import { determineDuelWinner } from "../state/duelStateMachine.js";
import { DuelResult, DuelState, DuelWinner } from "../types/index.js";

export type ScoreBreakdownReason =
  | "unread_rounds"
  | "read_penalty"
  | "read_streak_penalty"
  | "surprise_bonus"
  | "victory"
  | "clean_victory"
  | "hp_bonus"
  | "defeat_cap"
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
  tips?: string[];
}

export function buildScoreBreakdown(
  state: DuelState,
  options?: { dailyStreakDays?: number },
): ScoreBreakdown {
  const winner = determineDuelWinner(state);
  const calc = calculateScoreFromState(state, {
    dailyStreakDays: options?.dailyStreakDays ?? 0,
    initialPlayerHp: state.config.initialPlayerHp,
  });

  const lines: ScoreBreakdownLine[] = [];
  const tips: string[] = [];

  let unreadRounds = 0;
  let readPenaltyTotal = 0;
  let readCount = 0;
  let surpriseTotal = 0;
  let surpriseStreak = 0;

  for (const log of state.roundLogs) {
    if (log.predictionCorrect) {
      readPenaltyTotal += timesReadPenalty(readCount);
      readCount += 1;
      surpriseStreak = 0;
    } else {
      unreadRounds += 1;
      surpriseStreak += 1;
      if (surpriseStreak >= 2) {
        surpriseTotal += surpriseStreakBonus(surpriseStreak);
      }
    }
  }

  if (unreadRounds > 0) {
    lines.push({
      reason: "unread_rounds",
      points: unreadRounds * SCORE.UNREAD_ROUND,
      count: unreadRounds,
    });
  }

  if (readPenaltyTotal > 0) {
    lines.push({
      reason: "read_penalty",
      points: -readPenaltyTotal,
      count: readCount,
    });
    if (readCount >= 1) tips.push("tip_vary_pattern");
  }

  if (surpriseTotal > 0) {
    lines.push({
      reason: "surprise_bonus",
      points: surpriseTotal,
    });
    tips.push("tip_surprise_streak");
  }

  if (calc.readStreakPenalty > 0) {
    lines.push({
      reason: "read_streak_penalty",
      points: -calc.readStreakPenalty,
      count: state.readingStreak,
    });
  }

  if (winner === DuelWinner.PLAYER) {
    lines.push({
      reason: "victory",
      points: SCORE.VICTORY_BASE,
    });
    const hpBonus =
      calc.victoryBonus -
      SCORE.VICTORY_BASE -
      (calc.timesRead === 0 ? SCORE.CLEAN_VICTORY_BONUS : 0);
    if (hpBonus > 0) {
      lines.push({ reason: "hp_bonus", points: hpBonus });
    }
    if (calc.timesRead === 0) {
      lines.push({ reason: "clean_victory", points: SCORE.CLEAN_VICTORY_BONUS });
    }
  }

  if (calc.defeatCapApplied) {
    tips.push("tip_defeat_cap");
  }

  const preAdjustmentSum = lines.reduce((sum, line) => sum + line.points, 0);
  if (calc.defeatCapApplied && preAdjustmentSum > calc.subtotal) {
    lines.push({
      reason: "defeat_cap",
      points: calc.subtotal - preAdjustmentSum,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.points, 0);
  const dailyMult = dailyStreakMultiplier(options?.dailyStreakDays ?? 0);
  const total = calc.total;

  if (dailyMult > 1) {
    lines.push({
      reason: "daily_multiplier",
      points: total - subtotal,
      multiplier: dailyMult,
    });
  }

  if (calc.timesRead >= 3 && winner !== DuelWinner.PLAYER) {
    tips.push("tip_too_many_reads");
  }

  return { lines, subtotal, total, tips };
}

export function buildScoreBreakdownFromResult(
  result: DuelResult,
  options?: { dailyStreakDays?: number },
): ScoreBreakdown {
  const pseudoState = {
    roundLogs: result.roundLogs,
    blindsight: result.finalBlindsight,
    readingStreak: result.finalReadingStreak,
    playerHp: result.playerHp,
    zegonHp: result.zegonHp,
    roundsWonByPlayer: result.roundsWonByPlayer,
    roundsWonByZegon: result.roundsWonByZegon,
    config: { initialPlayerHp: 100, modifiers: {} },
  } as DuelState;
  return buildScoreBreakdown(pseudoState, options);
}

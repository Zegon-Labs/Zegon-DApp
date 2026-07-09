import { SCORE } from "../constants/index.js";
import { dailyStreakMultiplier } from "../progression/achievements.js";
import { determineDuelWinner } from "../state/duelStateMachine.js";
import {
  DuelState,
  DuelWinner,
  RoundLogEntry,
} from "../types/index.js";

export function timesReadPenalty(readIndex: number): number {
  if (readIndex <= 0) return SCORE.READ_PENALTY_FIRST;
  if (readIndex === 1) return SCORE.READ_PENALTY_SECOND;
  return SCORE.READ_PENALTY_THIRD_PLUS;
}

export function readStreakScorePenalty(finalReadingStreak: number): number {
  if (finalReadingStreak <= 0) return 0;
  return Math.min(
    SCORE.READ_STREAK_PENALTY_MAX,
    finalReadingStreak * SCORE.READ_STREAK_PENALTY,
  );
}

export function surpriseStreakBonus(streakLength: number): number {
  if (streakLength >= 4) return SCORE.SURPRISE_BONUS_4;
  if (streakLength === 3) return SCORE.SURPRISE_BONUS_3;
  if (streakLength === 2) return SCORE.SURPRISE_BONUS_2;
  return 0;
}

export interface ScoreCalculationOptions {
  dailyStreakDays?: number;
  initialPlayerHp?: number;
}

export interface ScoreCalculationResult {
  subtotal: number;
  total: number;
  timesRead: number;
  unreadRounds: number;
  surpriseBonusTotal: number;
  readStreakPenalty: number;
  victoryBonus: number;
  defeatCapApplied: boolean;
}

function computeRoundPoints(roundLogs: readonly RoundLogEntry[]): {
  roundPoints: number;
  timesRead: number;
  surpriseBonusTotal: number;
  unreadRounds: number;
} {
  let roundPoints = 0;
  let timesRead = 0;
  let surpriseBonusTotal = 0;
  let unreadRounds = 0;
  let surpriseStreak = 0;

  for (const log of roundLogs) {
    if (log.predictionCorrect) {
      roundPoints -= timesReadPenalty(timesRead);
      timesRead += 1;
      surpriseStreak = 0;
    } else {
      roundPoints += SCORE.UNREAD_ROUND;
      unreadRounds += 1;
      surpriseStreak += 1;
      if (surpriseStreak >= 2) {
        surpriseBonusTotal += surpriseStreakBonus(surpriseStreak);
      }
    }
  }

  return { roundPoints, timesRead, surpriseBonusTotal, unreadRounds };
}

/** Sum of running score snapshots after each completed round (Ghost board metric). */
export function sumCumulativeRoundScores(roundLogs: readonly RoundLogEntry[]): number {
  let running = 0;
  let total = 0;
  let timesRead = 0;
  let surpriseStreak = 0;

  for (const log of roundLogs) {
    if (log.predictionCorrect) {
      running -= timesReadPenalty(timesRead);
      timesRead += 1;
      surpriseStreak = 0;
    } else {
      running += SCORE.UNREAD_ROUND;
      surpriseStreak += 1;
      if (surpriseStreak >= 2) {
        running += surpriseStreakBonus(surpriseStreak);
      }
    }
    total += running;
  }

  return total;
}

export function calculateScoreFromState(
  state: DuelState,
  options?: ScoreCalculationOptions,
): ScoreCalculationResult {
  const roundLogs = state.roundLogs;
  const winner = determineDuelWinner(state);

  const { roundPoints, timesRead, surpriseBonusTotal, unreadRounds } =
    computeRoundPoints(roundLogs);

  const readStreakPenalty = readStreakScorePenalty(state.readingStreak);

  let subtotal = roundPoints + surpriseBonusTotal - readStreakPenalty;

  let victoryBonus = 0;
  if (winner === DuelWinner.PLAYER) {
    victoryBonus = SCORE.VICTORY_BASE;
    victoryBonus += Math.floor(state.playerHp / 10) * SCORE.VICTORY_HP_CHUNK;
    if (timesRead === 0) {
      victoryBonus += SCORE.CLEAN_VICTORY_BONUS;
    }
    subtotal += victoryBonus;
  }

  let defeatCapApplied = false;
  if (winner !== DuelWinner.PLAYER) {
    const maxOnLoss = Math.round(
      (unreadRounds * SCORE.UNREAD_ROUND + surpriseBonusTotal) * SCORE.DEFEAT_SCORE_CAP_RATIO,
    );
    if (subtotal > maxOnLoss) {
      subtotal = maxOnLoss;
      defeatCapApplied = true;
    }
  }

  const dailyMult = dailyStreakMultiplier(options?.dailyStreakDays ?? 0);
  const total = Math.max(0, Math.round(subtotal * dailyMult));

  return {
    subtotal,
    total,
    timesRead,
    unreadRounds,
    surpriseBonusTotal,
    readStreakPenalty,
    victoryBonus,
    defeatCapApplied,
  };
}

/** Points earned or lost on a single round (for HUD delta popups). */
export function scorePointsForRound(
  log: RoundLogEntry,
  timesReadBefore: number,
  surpriseStreakBefore: number,
): number {
  if (log.predictionCorrect) {
    return -timesReadPenalty(timesReadBefore);
  }
  let points = SCORE.UNREAD_ROUND;
  const streakAfter = surpriseStreakBefore + 1;
  if (streakAfter >= 2) {
    points += surpriseStreakBonus(streakAfter);
  }
  return points;
}

/** Delta for the most recent round only — matches the round toast, not streak swings. */
export function scoreDeltaFromLastRound(roundLogs: readonly RoundLogEntry[]): number {
  if (roundLogs.length === 0) return 0;
  let timesRead = 0;
  let surpriseStreak = 0;
  for (let i = 0; i < roundLogs.length - 1; i++) {
    const log = roundLogs[i]!;
    if (log.predictionCorrect) {
      timesRead += 1;
      surpriseStreak = 0;
    } else {
      surpriseStreak += 1;
    }
  }
  return scorePointsForRound(
    roundLogs[roundLogs.length - 1]!,
    timesRead,
    surpriseStreak,
  );
}

/** Running duel score mid-fight (round points only; streak penalty applies at duel end). */
export function estimateLiveScoreRaw(state: DuelState): number {
  const { roundPoints, surpriseBonusTotal } = computeRoundPoints(state.roundLogs);
  return roundPoints + surpriseBonusTotal;
}

/** Partial score estimate mid-duel (no victory/defeat cap, may be negative). */
export function estimateLiveScore(state: DuelState): number {
  return estimateLiveScoreRaw(state);
}

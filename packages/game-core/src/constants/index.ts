import { WeaponId } from "../types/index.js";

export const COMBAT = {
  INITIAL_HP: 100,
  /** Safety cap — duels end on HP, not round count. */
  MAX_ROUNDS: 999,
  /** Fixed damage per connected hit (5 skulls × 20 = 100 HP). */
  HIT_DAMAGE: 20,
  RELOAD_VULNERABILITY_DAMAGE_MULTIPLIER: 0.5,
  /** @deprecated DEADEYE now deals remaining player HP (lethal). */
  DEADEYE_DAMAGE_MULTIPLIER: 1.5,
  DEADEYE_POST_CONSUME_BLINDSIGHT: 70,
} as const;

export const READING = {
  /** Consecutive correct reads before DEADEYE. */
  DEADEYE_STREAK: 2,
} as const;

export const ITEM = {
  COOLDOWN_ROUNDS: 4,
  COOLDOWN_MIN: 3,
  COOLDOWN_MAX: 5,
} as const;

/** @deprecated Legacy — display only, derived from reading streak. */
export const BLINDSIGHT = {
  MIN: 0,
  MAX: 100,
  DEADEYE_THRESHOLD: 100,
} as const;

export const DEFAULT_DUEL_CONFIG = {
  maxRounds: COMBAT.MAX_ROUNDS,
  initialPlayerHp: COMBAT.INITIAL_HP,
  initialZegonHp: COMBAT.INITIAL_HP,
  weapon: WeaponId.REVOLVER,
  mode: "standard" as const,
};

export const SCORE = {
  /** @deprecated use UNREAD_ROUND */
  SURVIVED_ROUND: 8,
  UNREAD_ROUND: 8,
  READ_PENALTY_FIRST: 15,
  READ_PENALTY_SECOND: 20,
  READ_PENALTY_THIRD_PLUS: 25,
  /** −25 pts per level of ZEGON read streak at duel end (max −50). */
  READ_STREAK_PENALTY: 25,
  READ_STREAK_PENALTY_MAX: 50,
  /** @deprecated use READ_STREAK_PENALTY — was tied to 0–100 blindsight % */
  BLINDSIGHT_PENALTY_FACTOR: 1.5,
  BLINDSIGHT_PENALTY_MAX: 150,
  SURPRISE_BONUS_2: 8,
  SURPRISE_BONUS_3: 12,
  SURPRISE_BONUS_4: 20,
  VICTORY_BASE: 80,
  VICTORY_HP_CHUNK: 15,
  CLEAN_VICTORY_BONUS: 10,
  /** @deprecated use VICTORY_BASE */
  VICTORY_BONUS: 80,
  /** @deprecated use READ_PENALTY_FIRST */
  TIMES_READ_PENALTY: 15,
  DEFEAT_SCORE_CAP_RATIO: 0.4,
} as const;

export const DUEL = {
  /** Tie-break after this many rounds if both still standing. */
  MAX_ROUNDS_TIEBREAK: 20,
} as const;

/** Selectable duel lengths (rounds before the tie-break). */
export const DUEL_LENGTH_PRESETS = {
  quick: 10,
  standard: DUEL.MAX_ROUNDS_TIEBREAK,
  long: 30,
} as const;

export type DuelLengthId = keyof typeof DUEL_LENGTH_PRESETS;

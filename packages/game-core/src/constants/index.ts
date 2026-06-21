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
  SURVIVED_ROUND: 10,
  BLINDSIGHT_PENALTY_FACTOR: 1,
  VICTORY_BONUS: 100,
  TIMES_READ_PENALTY: 5,
} as const;

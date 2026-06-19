import { WeaponId } from "../types/index.js";

export const COMBAT = {
  INITIAL_HP: 100,
  MAX_ROUNDS: 9,
  RELOAD_VULNERABILITY_DAMAGE_MULTIPLIER: 0.5,
  DEADEYE_DAMAGE_MULTIPLIER: 1.5,
  DEADEYE_POST_CONSUME_BLINDSIGHT: 70,
} as const;

export const BLINDSIGHT = {
  MIN: 0,
  MAX: 100,
  ON_CORRECT_PREDICT: 15,
  ON_WRONG_PREDICT: -10,
  ON_FEINT: -8,
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

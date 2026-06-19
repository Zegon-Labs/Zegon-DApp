import { BLINDSIGHT } from "../constants/index.js";
import { applyNoiseToBlindsight } from "../weapons/registry.js";
import {
  PlayerAction,
  RoundOutcome,
  WeaponId,
} from "../types/index.js";

export interface BlindsightResult {
  value: number;
  isDeadeye: boolean;
  delta: number;
}

export function clampBlindsight(value: number): number {
  return Math.max(BLINDSIGHT.MIN, Math.min(BLINDSIGHT.MAX, value));
}

export function computeBlindsightDelta(
  predictionCorrect: boolean,
  playerAction: PlayerAction,
  weapon: WeaponId,
): number {
  let baseDelta: number;

  if (playerAction === PlayerAction.FEINT) {
    baseDelta = BLINDSIGHT.ON_FEINT;
  } else if (predictionCorrect) {
    baseDelta = BLINDSIGHT.ON_CORRECT_PREDICT;
  } else {
    baseDelta = BLINDSIGHT.ON_WRONG_PREDICT;
  }

  return applyNoiseToBlindsight(baseDelta, weapon);
}

export function applyBlindsight(
  current: number,
  delta: number,
): BlindsightResult {
  const value = clampBlindsight(current + delta);
  const isDeadeye = value >= BLINDSIGHT.DEADEYE_THRESHOLD;
  return { value, isDeadeye, delta };
}

export function shouldTriggerDeadeye(blindsight: number): boolean {
  return blindsight >= BLINDSIGHT.DEADEYE_THRESHOLD;
}

export function computeBlindsightFromOutcome(
  current: number,
  outcome: Pick<
    RoundOutcome,
    "predictionCorrect" | "playerAction"
  >,
  weapon: WeaponId,
): BlindsightResult {
  const delta = computeBlindsightDelta(
    outcome.predictionCorrect,
    outcome.playerAction,
    weapon,
  );
  return applyBlindsight(current, delta);
}

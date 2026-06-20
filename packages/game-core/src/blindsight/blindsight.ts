import { BLINDSIGHT } from "../constants/index.js";
import { getEffectiveBlindsightOnCorrect, getEffectiveDeadeyeThreshold } from "../modes/zegonArchetypes.js";
import { applyNoiseToBlindsight } from "../weapons/registry.js";
import {
  DuelModifiers,
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
  modifiers?: DuelModifiers,
): number {
  let baseDelta: number;

  if (playerAction === PlayerAction.FEINT) {
    baseDelta = BLINDSIGHT.ON_FEINT;
  } else if (predictionCorrect) {
    baseDelta = getEffectiveBlindsightOnCorrect(modifiers);
  } else {
    baseDelta = BLINDSIGHT.ON_WRONG_PREDICT;
  }

  return applyNoiseToBlindsight(baseDelta, weapon);
}

export function applyBlindsight(
  current: number,
  delta: number,
  modifiers?: DuelModifiers,
): BlindsightResult {
  const value = clampBlindsight(current + delta);
  const threshold = getEffectiveDeadeyeThreshold(modifiers);
  const isDeadeye = value >= threshold;
  return { value, isDeadeye, delta };
}

export function shouldTriggerDeadeye(
  blindsight: number,
  modifiers?: DuelModifiers,
): boolean {
  return blindsight >= getEffectiveDeadeyeThreshold(modifiers);
}

export function computeBlindsightFromOutcome(
  current: number,
  outcome: Pick<
    RoundOutcome,
    "predictionCorrect" | "playerAction"
  >,
  weapon: WeaponId,
  modifiers?: DuelModifiers,
): BlindsightResult {
  const delta = computeBlindsightDelta(
    outcome.predictionCorrect,
    outcome.playerAction,
    weapon,
    modifiers,
  );
  return applyBlindsight(current, delta, modifiers);
}

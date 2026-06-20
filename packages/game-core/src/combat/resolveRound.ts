import { COMBAT } from "../constants/index.js";
import { applyZegonDamageMultiplier } from "../modes/zegonArchetypes.js";
import { computeBlindsightFromOutcome } from "../blindsight/blindsight.js";
import { getWeapon } from "../weapons/registry.js";
import {
  isFireAction,
  PlayerAction,
  RoundContext,
  RoundLogEntry,
  RoundOutcome,
  ZegonAction,
  ZegonDecision,
} from "../types/index.js";

function isZegonFire(action: ZegonAction): boolean {
  return action === ZegonAction.FIRE_HIGH || action === ZegonAction.FIRE_LOW;
}

function zegonHitsPlayer(
  zegonMove: ZegonAction,
  playerAction: PlayerAction,
  predictionCorrect: boolean,
  isDeadeye: boolean,
): boolean {
  if (!isZegonFire(zegonMove)) {
    return false;
  }

  if (isDeadeye) {
    return playerAction !== PlayerAction.DODGE || predictionCorrect;
  }

  if (playerAction === PlayerAction.DODGE) {
    return false;
  }

  if (playerAction === PlayerAction.RELOAD) {
    return true;
  }

  if (playerAction === PlayerAction.FEINT) {
    return predictionCorrect;
  }

  if (isFireAction(playerAction)) {
    return predictionCorrect;
  }

  return !predictionCorrect;
}

function playerHitsZegon(
  playerAction: PlayerAction,
  zegonMove: ZegonAction,
  predictionCorrect: boolean,
  isDeadeye: boolean,
): boolean {
  if (!isFireAction(playerAction)) {
    return false;
  }

  if (predictionCorrect) {
    return false;
  }

  if (isDeadeye && isZegonFire(zegonMove)) {
    return false;
  }

  if (zegonMove === ZegonAction.DODGE) {
    return false;
  }

  return true;
}

function computeAmmoAfter(
  playerAction: PlayerAction,
  currentAmmo: number,
  weaponId: RoundContext["weapon"],
): number {
  const weapon = getWeapon(weaponId);

  if (isFireAction(playerAction)) {
    return Math.max(0, currentAmmo - 1);
  }

  if (playerAction === PlayerAction.RELOAD) {
    return weapon.reloadAmount;
  }

  return currentAmmo;
}

function computeDamage(
  baseDamage: number,
  isDeadeye: boolean,
  isReloadVulnerable: boolean,
): number {
  let damage = baseDamage;

  if (isDeadeye) {
    damage = Math.round(damage * COMBAT.DEADEYE_DAMAGE_MULTIPLIER);
  }

  if (isReloadVulnerable) {
    damage = Math.round(damage * COMBAT.RELOAD_VULNERABILITY_DAMAGE_MULTIPLIER);
  }

  return damage;
}

export function resolveRound(
  ctx: RoundContext,
  playerAction: PlayerAction,
  zegonDecision: ZegonDecision,
  logMeta: Partial<RoundLogEntry> = {},
): RoundOutcome {
  const weapon = getWeapon(ctx.weapon);
  const predictionCorrect =
    zegonDecision.predictedPlayerMove === playerAction;

  const zegonHits = zegonHitsPlayer(
    zegonDecision.zegonMove,
    playerAction,
    predictionCorrect,
    ctx.isDeadeye,
  );

  const playerHits = playerHitsZegon(
    playerAction,
    zegonDecision.zegonMove,
    predictionCorrect,
    ctx.isDeadeye,
  );

  const isReloadVulnerable = playerAction === PlayerAction.RELOAD;

  let playerDamage = 0;
  let zegonDamage = 0;

  if (zegonHits) {
    playerDamage = applyZegonDamageMultiplier(
      computeDamage(
        weapon.damage,
        ctx.isDeadeye,
        isReloadVulnerable,
      ),
      ctx.modifiers,
    );
  }

  if (playerHits) {
    zegonDamage = weapon.damage;
  }

  const ammoAfter = computeAmmoAfter(playerAction, ctx.ammo, ctx.weapon);

  const blindsightResult = computeBlindsightFromOutcome(
    ctx.blindsight,
    { predictionCorrect, playerAction },
    ctx.weapon,
    ctx.modifiers,
  );

  const deadeyeTriggered =
    blindsightResult.isDeadeye && !ctx.isDeadeye;
  const deadeyeConsumed = ctx.isDeadeye && zegonHits;

  const log: RoundLogEntry = {
    roundIndex: ctx.roundIndex,
    playerAction,
    zegonDecision,
    predictionCorrect,
    ...logMeta,
  };

  return {
    playerAction,
    zegonDecision,
    predictionCorrect,
    playerDamage,
    zegonDamage,
    blindsightDelta: blindsightResult.delta,
    blindsightAfter: deadeyeConsumed
      ? COMBAT.DEADEYE_POST_CONSUME_BLINDSIGHT
      : blindsightResult.value,
    deadeyeTriggered,
    deadeyeConsumed,
    ammoAfter,
    log,
  };
}

export function applyRoundOutcomeToHp(
  playerHp: number,
  zegonHp: number,
  outcome: RoundOutcome,
): { playerHp: number; zegonHp: number } {
  return {
    playerHp: Math.max(0, playerHp - outcome.playerDamage),
    zegonHp: Math.max(0, zegonHp - outcome.zegonDamage),
  };
}

export function determineRoundWinner(
  outcome: RoundOutcome,
): "player" | "zegon" | "none" {
  if (outcome.zegonDamage > outcome.playerDamage) {
    return "player";
  }
  if (outcome.playerDamage > outcome.zegonDamage) {
    return "zegon";
  }
  if (outcome.playerDamage > 0 || outcome.zegonDamage > 0) {
    return outcome.zegonDamage >= outcome.playerDamage ? "player" : "zegon";
  }
  return "none";
}

import { COMBAT, ITEM } from "../constants/index.js";
import { applyZegonDamageMultiplier } from "../modes/zegonArchetypes.js";
import {
  computeReadingStreakAfter,
  getEffectiveDeadeyeStreak,
  readingStreakToDisplay,
} from "./readingStreak.js";
import { isPlayerDodge, isZegonDodge } from "./dodge.js";
import {
  DuelItemId,
  PlayerAction,
  RoundContext,
  RoundLogEntry,
  RoundOutcome,
  ZegonAction,
  ZegonDecision,
} from "../types/index.js";

function isZegonFire(action: ZegonAction): boolean {
  return action === ZegonAction.FIRE;
}

function isSmokeRound(
  playerAction: PlayerAction,
  equippedItem: DuelItemId,
): boolean {
  return playerAction === PlayerAction.USE_ITEM && equippedItem === DuelItemId.SMOKE;
}

function isMirrorRound(
  playerAction: PlayerAction,
  equippedItem: DuelItemId,
): boolean {
  return playerAction === PlayerAction.USE_ITEM && equippedItem === DuelItemId.MIRROR;
}

function isPlateRound(
  playerAction: PlayerAction,
  equippedItem: DuelItemId,
): boolean {
  return playerAction === PlayerAction.USE_ITEM && equippedItem === DuelItemId.PLATE;
}

function effectivePredictionCorrect(
  playerAction: PlayerAction,
  equippedItem: DuelItemId,
  predicted: PlayerAction,
): boolean {
  if (isSmokeRound(playerAction, equippedItem)) {
    return false;
  }
  return predicted === playerAction;
}

function zegonHitsPlayer(
  ctx: RoundContext,
  playerAction: PlayerAction,
  zegonMove: ZegonAction,
  predictionCorrect: boolean,
): boolean {
  if (!isZegonFire(zegonMove)) {
    return false;
  }

  if (isPlateRound(playerAction, ctx.equippedItem)) {
    return false;
  }

  if (isPlayerDodge(playerAction)) {
    if (ctx.isDeadeye && predictionCorrect) return true;
    return false;
  }

  if (isSmokeRound(playerAction, ctx.equippedItem)) {
    return false;
  }

  if (isMirrorRound(playerAction, ctx.equippedItem)) {
    return false;
  }

  if (playerAction === PlayerAction.FIRE) {
    return predictionCorrect;
  }

  if (playerAction === PlayerAction.USE_ITEM) {
    return predictionCorrect;
  }

  return false;
}

function playerHitsZegon(
  playerAction: PlayerAction,
  equippedItem: DuelItemId,
  zegonMove: ZegonAction,
  predictionCorrect: boolean,
): boolean {
  if (isMirrorRound(playerAction, equippedItem)) {
    return predictionCorrect && isZegonFire(zegonMove);
  }

  if (playerAction !== PlayerAction.FIRE) {
    return false;
  }

  if (predictionCorrect) {
    return false;
  }

  if (isZegonDodge(zegonMove)) {
    return false;
  }

  return isZegonFire(zegonMove);
}

function zegonDamageToPlayer(ctx: RoundContext, zegonHits: boolean): number {
  if (!zegonHits) return 0;
  if (ctx.isDeadeye) {
    return ctx.playerHp;
  }
  return applyZegonDamageMultiplier(COMBAT.HIT_DAMAGE, ctx.modifiers);
}

function mirrorDamageToZegon(ctx: RoundContext, mirrorHit: boolean): number {
  if (!mirrorHit) return 0;
  if (ctx.isDeadeye) {
    return ctx.zegonHp;
  }
  return COMBAT.HIT_DAMAGE;
}

export function resolveRound(
  ctx: RoundContext,
  playerAction: PlayerAction,
  zegonDecision: ZegonDecision,
  logMeta: Partial<RoundLogEntry> = {},
): RoundOutcome {
  const usedSmoke = isSmokeRound(playerAction, ctx.equippedItem);
  const usedMirror = isMirrorRound(playerAction, ctx.equippedItem);
  const usedPlate = isPlateRound(playerAction, ctx.equippedItem);
  const usedItem =
    playerAction === PlayerAction.USE_ITEM ? ctx.equippedItem : undefined;

  const predictionCorrect = effectivePredictionCorrect(
    playerAction,
    ctx.equippedItem,
    zegonDecision.predictedPlayerMove,
  );

  const zegonFired = isZegonFire(zegonDecision.zegonMove);
  const plateBlocked = usedPlate && zegonFired;
  const mirrorReflected = usedMirror && predictionCorrect && zegonFired;

  const deadeyeStreak = getEffectiveDeadeyeStreak(ctx.modifiers);

  const zegonHits = zegonHitsPlayer(
    ctx,
    playerAction,
    zegonDecision.zegonMove,
    predictionCorrect,
  );

  const playerHits = playerHitsZegon(
    playerAction,
    ctx.equippedItem,
    zegonDecision.zegonMove,
    predictionCorrect,
  );

  let playerDamage = 0;
  let zegonDamage = 0;

  if (zegonHits) {
    playerDamage = zegonDamageToPlayer(ctx, true);
  }

  if (playerHits) {
    zegonDamage = mirrorReflected
      ? mirrorDamageToZegon(ctx, true)
      : COMBAT.HIT_DAMAGE;
  }

  const deadeyeConsumed =
    ctx.isDeadeye &&
    (zegonHits || usedSmoke || plateBlocked || mirrorReflected);

  const readingStreakAfter = computeReadingStreakAfter(
    ctx.readingStreak,
    predictionCorrect,
    usedSmoke,
    deadeyeConsumed,
    plateBlocked,
  );

  const deadeyeTriggered =
    !ctx.isDeadeye &&
    readingStreakAfter >= deadeyeStreak &&
    predictionCorrect &&
    !usedSmoke;

  const blindsightBefore = readingStreakToDisplay(ctx.readingStreak, deadeyeStreak);
  const blindsightAfter = deadeyeConsumed
    ? 0
    : readingStreakToDisplay(readingStreakAfter, deadeyeStreak);

  const itemCooldownAfter =
    playerAction === PlayerAction.USE_ITEM
      ? ITEM.COOLDOWN_ROUNDS
      : Math.max(0, ctx.itemCooldown - 1);

  const log: RoundLogEntry = {
    roundIndex: ctx.roundIndex,
    playerAction,
    zegonDecision,
    predictionCorrect,
    itemUsed: usedItem,
    ...logMeta,
  };

  return {
    playerAction,
    zegonDecision,
    predictionCorrect,
    playerDamage,
    zegonDamage,
    blindsightDelta: blindsightAfter - blindsightBefore,
    blindsightAfter,
    readingStreakAfter,
    deadeyeTriggered,
    deadeyeConsumed,
    ammoAfter: ctx.ammo,
    itemCooldownAfter,
    itemUsed: usedItem,
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

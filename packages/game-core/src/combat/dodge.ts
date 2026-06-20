import { PlayerAction, ZegonAction } from "../types/index.js";

/** High dodge avoids low shots; low dodge avoids high shots. */
export function dodgeAvoidsShot(
  dodge: PlayerAction | ZegonAction,
  fire: PlayerAction | ZegonAction,
): boolean {
  const dodgeHigh =
    dodge === PlayerAction.DODGE_HIGH || dodge === ZegonAction.DODGE_HIGH;
  const dodgeLow =
    dodge === PlayerAction.DODGE_LOW || dodge === ZegonAction.DODGE_LOW;
  const fireHigh =
    fire === PlayerAction.FIRE_HIGH || fire === ZegonAction.FIRE_HIGH;
  const fireLow =
    fire === PlayerAction.FIRE_LOW || fire === ZegonAction.FIRE_LOW;
  return (dodgeHigh && fireLow) || (dodgeLow && fireHigh);
}

export function isPlayerDodge(action: PlayerAction): boolean {
  return (
    action === PlayerAction.DODGE_HIGH || action === PlayerAction.DODGE_LOW
  );
}

export function isZegonDodge(action: ZegonAction): boolean {
  return action === ZegonAction.DODGE_HIGH || action === ZegonAction.DODGE_LOW;
}

export function isDodgeAction(action: PlayerAction | ZegonAction): boolean {
  return isPlayerDodge(action as PlayerAction) || isZegonDodge(action as ZegonAction);
}

/** Counter-dodge for a predicted shot height. */
export function counterDodgeForFire(
  fire: PlayerAction.FIRE_HIGH | PlayerAction.FIRE_LOW,
): PlayerAction.DODGE_HIGH | PlayerAction.DODGE_LOW {
  return fire === PlayerAction.FIRE_HIGH
    ? PlayerAction.DODGE_LOW
    : PlayerAction.DODGE_HIGH;
}

/** ZEGON dodge that avoids the player's predicted shot. */
export function zegonDodgeVsFire(
  fire: PlayerAction.FIRE_HIGH | PlayerAction.FIRE_LOW,
): ZegonAction.DODGE_HIGH | ZegonAction.DODGE_LOW {
  return fire === PlayerAction.FIRE_HIGH
    ? ZegonAction.DODGE_LOW
    : ZegonAction.DODGE_HIGH;
}

/** ZEGON shot that beats a predicted dodge direction. */
export function zegonFireVsDodge(
  dodge: PlayerAction.DODGE_HIGH | PlayerAction.DODGE_LOW,
): ZegonAction.FIRE_HIGH | ZegonAction.FIRE_LOW {
  return dodge === PlayerAction.DODGE_HIGH
    ? ZegonAction.FIRE_LOW
    : ZegonAction.FIRE_HIGH;
}

import { PlayerAction, ZegonAction } from "../types/index.js";

export function isPlayerDodge(action: PlayerAction): boolean {
  return action === PlayerAction.DODGE;
}

export function isZegonDodge(action: ZegonAction): boolean {
  return action === ZegonAction.DODGE;
}

export function isDodgeAction(action: PlayerAction | ZegonAction): boolean {
  return isPlayerDodge(action as PlayerAction) || isZegonDodge(action as ZegonAction);
}

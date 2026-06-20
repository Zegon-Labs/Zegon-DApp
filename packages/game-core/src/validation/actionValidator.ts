import { DuelPhase, PlayerAction, DuelState } from "../types/index.js";
import { isFireAction } from "../types/index.js";

export class ActionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionValidationError";
  }
}

export function canPerformAction(
  state: Pick<DuelState, "phase" | "ammo">,
  action: PlayerAction,
): boolean {
  if (state.phase !== DuelPhase.AWAITING_PLAYER) {
    return false;
  }

  if (isFireAction(action) && state.ammo <= 0) {
    return false;
  }

  return true;
}

export function assertCanPerformAction(
  state: Pick<DuelState, "phase" | "ammo">,
  action: PlayerAction,
): void {
  if (!canPerformAction(state, action)) {
    if (state.phase !== DuelPhase.AWAITING_PLAYER) {
      throw new ActionValidationError(
        `Cannot act during phase ${state.phase}`,
      );
    }
    if (isFireAction(action) && state.ammo <= 0) {
      throw new ActionValidationError("No ammo to fire");
    }
    throw new ActionValidationError("Action not allowed");
  }
}

export function getAvailableActions(
  state: Pick<DuelState, "phase" | "ammo">,
): PlayerAction[] {
  if (state.phase !== DuelPhase.AWAITING_PLAYER) {
    return [];
  }

  const actions: PlayerAction[] = [
    PlayerAction.DODGE_HIGH,
    PlayerAction.DODGE_LOW,
    PlayerAction.FEINT,
    PlayerAction.RELOAD,
  ];

  if (state.ammo > 0) {
    actions.unshift(PlayerAction.FIRE_HIGH, PlayerAction.FIRE_LOW);
  }

  return actions;
}

export function assertHistoryIsolation(
  history: readonly PlayerAction[],
  currentAction: PlayerAction,
): void {
  if (history.includes(currentAction) && history.length === 0) {
    throw new ActionValidationError("History isolation violated");
  }
}

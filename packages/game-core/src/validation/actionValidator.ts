import { DuelPhase, DuelItemId, PlayerAction, DuelState } from "../types/index.js";

export class ActionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionValidationError";
  }
}

export function canPerformAction(
  state: Pick<DuelState, "phase" | "itemCooldown">,
  action: PlayerAction,
): boolean {
  if (state.phase !== DuelPhase.AWAITING_PLAYER) {
    return false;
  }

  if (action === PlayerAction.USE_ITEM && state.itemCooldown > 0) {
    return false;
  }

  return true;
}

export function assertCanPerformAction(
  state: Pick<DuelState, "phase" | "itemCooldown">,
  action: PlayerAction,
): void {
  if (!canPerformAction(state, action)) {
    if (state.phase !== DuelPhase.AWAITING_PLAYER) {
      throw new ActionValidationError(
        `Cannot act during phase ${state.phase}`,
      );
    }
    if (action === PlayerAction.USE_ITEM && state.itemCooldown > 0) {
      throw new ActionValidationError("Item on cooldown");
    }
    throw new ActionValidationError("Action not allowed");
  }
}

export function getAvailableActions(
  state: Pick<DuelState, "phase" | "itemCooldown">,
): PlayerAction[] {
  if (state.phase !== DuelPhase.AWAITING_PLAYER) {
    return [];
  }

  const actions: PlayerAction[] = [
    PlayerAction.FIRE,
    PlayerAction.DODGE,
  ];

  if (state.itemCooldown <= 0) {
    actions.push(PlayerAction.USE_ITEM);
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

export function isValidDuelItem(item: string): item is DuelItemId {
  return Object.values(DuelItemId).includes(item as DuelItemId);
}

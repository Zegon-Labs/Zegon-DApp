import { ZegonAction } from "@zegon/game-core";

const ZEGON_MOVE_TO_UINT8: Record<ZegonAction, number> = {
  [ZegonAction.FIRE]: 0,
  [ZegonAction.DODGE]: 1,
};

const UINT8_TO_ZEGON_MOVE: Record<number, ZegonAction> = {
  0: ZegonAction.FIRE,
  1: ZegonAction.DODGE,
};

export function zegonActionToUint8(move: ZegonAction): number {
  return ZEGON_MOVE_TO_UINT8[move];
}

export function uint8ToZegonAction(move: number): ZegonAction {
  return UINT8_TO_ZEGON_MOVE[move] ?? ZegonAction.FIRE;
}

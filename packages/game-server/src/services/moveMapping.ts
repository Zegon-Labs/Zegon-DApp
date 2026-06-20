import { ZegonAction } from "@zegon/game-core";

const ZEGON_MOVE_TO_UINT8: Record<ZegonAction, number> = {
  [ZegonAction.FIRE_HIGH]: 0,
  [ZegonAction.FIRE_LOW]: 1,
  [ZegonAction.DODGE_HIGH]: 2,
  [ZegonAction.DODGE_LOW]: 3,
  [ZegonAction.FEINT]: 4,
  [ZegonAction.RELOAD]: 5,
};

const UINT8_TO_ZEGON_MOVE: Record<number, ZegonAction> = {
  0: ZegonAction.FIRE_HIGH,
  1: ZegonAction.FIRE_LOW,
  2: ZegonAction.DODGE_HIGH,
  3: ZegonAction.DODGE_LOW,
  4: ZegonAction.FEINT,
  5: ZegonAction.RELOAD,
};

export function zegonActionToUint8(move: ZegonAction): number {
  return ZEGON_MOVE_TO_UINT8[move];
}

export function uint8ToZegonAction(move: number): ZegonAction {
  return UINT8_TO_ZEGON_MOVE[move] ?? ZegonAction.FIRE_HIGH;
}

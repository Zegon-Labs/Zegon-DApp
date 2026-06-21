import { DuelItemId, PlayerAction } from "../types/index.js";

export function isItemAction(action: PlayerAction): boolean {
  return action === PlayerAction.USE_ITEM;
}

export function itemLabelKey(item: DuelItemId): string {
  switch (item) {
    case DuelItemId.SMOKE:
      return "itemSmoke";
    case DuelItemId.MIRROR:
      return "itemMirror";
    case DuelItemId.PLATE:
      return "itemPlate";
  }
}

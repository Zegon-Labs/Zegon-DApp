import { describe, it, expect } from "vitest";
import {
  getWeapon,
  getStartingAmmo,
  WeaponId,
  PlayerAction,
  DuelPhase,
  canPerformAction,
  getAvailableActions,
} from "../index.js";

describe("WeaponRegistry", () => {
  it("returns correct revolver stats", () => {
    const w = getWeapon(WeaponId.REVOLVER);
    expect(w.damage).toBe(25);
    expect(w.maxAmmo).toBe(6);
    expect(w.noiseFactor).toBe(1.0);
  });

  it("starting ammo equals max", () => {
    expect(getStartingAmmo(WeaponId.SHOTGUN)).toBe(2);
  });
});

describe("ActionValidator", () => {
  it("blocks item use on cooldown", () => {
    expect(
      canPerformAction(
        { phase: DuelPhase.AWAITING_PLAYER, itemCooldown: 2 },
        PlayerAction.USE_ITEM,
      ),
    ).toBe(false);
  });

  it("allows fire and dodge always", () => {
    expect(
      canPerformAction(
        { phase: DuelPhase.AWAITING_PLAYER, itemCooldown: 0 },
        PlayerAction.FIRE,
      ),
    ).toBe(true);
    expect(
      canPerformAction(
        { phase: DuelPhase.AWAITING_PLAYER, itemCooldown: 3 },
        PlayerAction.DODGE,
      ),
    ).toBe(true);
  });

  it("returns use item only when off cooldown", () => {
    const ready = getAvailableActions({
      phase: DuelPhase.AWAITING_PLAYER,
      itemCooldown: 0,
    });
    expect(ready).toContain(PlayerAction.USE_ITEM);

    const cooling = getAvailableActions({
      phase: DuelPhase.AWAITING_PLAYER,
      itemCooldown: 2,
    });
    expect(cooling).not.toContain(PlayerAction.USE_ITEM);
    expect(cooling).toContain(PlayerAction.FIRE);
  });
});

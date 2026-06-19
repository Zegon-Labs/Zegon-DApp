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
  it("blocks fire without ammo", () => {
    expect(
      canPerformAction(
        { phase: DuelPhase.AWAITING_PLAYER, ammo: 0 },
        PlayerAction.FIRE_HIGH,
      ),
    ).toBe(false);
  });

  it("allows reload without ammo", () => {
    expect(
      canPerformAction(
        { phase: DuelPhase.AWAITING_PLAYER, ammo: 0 },
        PlayerAction.RELOAD,
      ),
    ).toBe(true);
  });

  it("returns fire actions only when ammo available", () => {
    const withAmmo = getAvailableActions({
      phase: DuelPhase.AWAITING_PLAYER,
      ammo: 3,
    });
    expect(withAmmo).toContain(PlayerAction.FIRE_HIGH);

    const noAmmo = getAvailableActions({
      phase: DuelPhase.AWAITING_PLAYER,
      ammo: 0,
    });
    expect(noAmmo).not.toContain(PlayerAction.FIRE_HIGH);
    expect(noAmmo).toContain(PlayerAction.RELOAD);
  });
});

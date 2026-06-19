import { WeaponId, WeaponStats } from "../types/index.js";

const WEAPONS: Record<WeaponId, WeaponStats> = {
  [WeaponId.REVOLVER]: {
    damage: 25,
    maxAmmo: 6,
    drawSpeed: 1.0,
    noiseFactor: 1.0,
    reloadAmount: 6,
  },
  [WeaponId.SHOTGUN]: {
    damage: 40,
    maxAmmo: 2,
    drawSpeed: 0.7,
    noiseFactor: 1.5,
    reloadAmount: 2,
  },
  [WeaponId.DERRINGER]: {
    damage: 15,
    maxAmmo: 2,
    drawSpeed: 1.3,
    noiseFactor: 0.7,
    reloadAmount: 2,
  },
  [WeaponId.GLITCH_PISTOL]: {
    damage: 25,
    maxAmmo: 4,
    drawSpeed: 1.1,
    noiseFactor: 0.5,
    reloadAmount: 4,
  },
};

export function getWeapon(id: WeaponId): WeaponStats {
  return WEAPONS[id];
}

export function getStartingAmmo(id: WeaponId): number {
  return WEAPONS[id].maxAmmo;
}

export function applyNoiseToBlindsight(
  baseDelta: number,
  weapon: WeaponId,
): number {
  const stats = getWeapon(weapon);
  if (baseDelta <= 0) {
    return baseDelta;
  }
  return Math.round(baseDelta * stats.noiseFactor);
}

export function getAllWeapons(): WeaponId[] {
  return Object.values(WeaponId);
}

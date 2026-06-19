import { DEFAULT_DUEL_CONFIG } from "../constants/index.js";
import { DuelConfig, WeaponId } from "../types/index.js";

const WEAPONS_ROTATION: WeaponId[] = [
  WeaponId.REVOLVER,
  WeaponId.SHOTGUN,
  WeaponId.DERRINGER,
  WeaponId.GLITCH_PISTOL,
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDailySeed(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createDailyDuel(date: Date = new Date()): DuelConfig {
  const seed = getDailySeed(date);
  const hash = hashString(seed);

  return {
    ...DEFAULT_DUEL_CONFIG,
    seed,
    mode: "daily",
    weapon: WEAPONS_ROTATION[hash % WEAPONS_ROTATION.length]!,
    initialZegonHp: 100 + (hash % 20),
  };
}

export function createStandardDuel(
  overrides: Partial<DuelConfig> = {},
): DuelConfig {
  return {
    ...DEFAULT_DUEL_CONFIG,
    mode: "standard",
    ...overrides,
  };
}

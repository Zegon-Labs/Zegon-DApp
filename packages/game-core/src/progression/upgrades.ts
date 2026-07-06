import { COMBAT } from "../constants/index.js";
import { DuelConfig, DuelModifiers } from "../types/index.js";

export type UpgradeId =
  | "fine_lead"
  | "hardened_leather"
  | "instinct"
  | "quick_hands"
  | "extra_powder";

export interface UpgradeDefinition {
  id: UpgradeId;
  nameEn: string;
  nameEs: string;
  descEn: string;
  descEs: string;
  maxLevel: number;
  costs: readonly number[];
  minPlayerLevel?: number;
}

export type UpgradeLevels = Partial<Record<UpgradeId, number>>;

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = {
  fine_lead: {
    id: "fine_lead",
    nameEn: "Fine Lead",
    nameEs: "Plomo fino",
    descEn: "+10% shot damage per level",
    descEs: "+10% daño por disparo por nivel",
    maxLevel: 5,
    costs: [50, 100, 200, 350, 500],
  },
  hardened_leather: {
    id: "hardened_leather",
    nameEn: "Hardened Leather",
    nameEs: "Cuero endurecido",
    descEn: "+5 starting HP per level",
    descEs: "+5 PS iniciales por nivel",
    maxLevel: 3,
    costs: [40, 80, 150],
  },
  instinct: {
    id: "instinct",
    nameEn: "Instinct",
    nameEs: "Instinto",
    descEn: "Blindsight rises slower when read",
    descEs: "Ciego-vista sube menos al leerte",
    maxLevel: 3,
    costs: [60, 120, 200],
    minPlayerLevel: 2,
  },
  quick_hands: {
    id: "quick_hands",
    nameEn: "Quick Hands",
    nameEs: "Manos rápidas",
    descEn: "−1 item cooldown per level",
    descEs: "−1 cooldown de ítem por nivel",
    maxLevel: 2,
    costs: [100, 250],
    minPlayerLevel: 3,
  },
  extra_powder: {
    id: "extra_powder",
    nameEn: "Extra Powder",
    nameEs: "Pólvora extra",
    descEn: "+1 starting ammo",
    descEs: "+1 munición inicial",
    maxLevel: 1,
    costs: [300],
    minPlayerLevel: 4,
  },
};

export const UPGRADE_ORDER: UpgradeId[] = [
  "fine_lead",
  "hardened_leather",
  "instinct",
  "quick_hands",
  "extra_powder",
];

export function getUpgradeLevel(
  levels: UpgradeLevels | undefined,
  id: UpgradeId,
): number {
  return Math.min(
    UPGRADE_DEFINITIONS[id].maxLevel,
    Math.max(0, levels?.[id] ?? 0),
  );
}

export function getUpgradeCost(id: UpgradeId, currentLevel: number): number | null {
  const def = UPGRADE_DEFINITIONS[id];
  if (currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel] ?? null;
}

export function canPurchaseUpgrade(
  id: UpgradeId,
  levels: UpgradeLevels | undefined,
  notches: number,
  playerLevel: number,
): { ok: true; cost: number } | { ok: false; reason: string } {
  const current = getUpgradeLevel(levels, id);
  const cost = getUpgradeCost(id, current);
  if (cost === null) return { ok: false, reason: "MAX_LEVEL" };
  const def = UPGRADE_DEFINITIONS[id];
  if (def.minPlayerLevel && playerLevel < def.minPlayerLevel) {
    return { ok: false, reason: "LEVEL_REQUIRED" };
  }
  if (notches < cost) return { ok: false, reason: "INSUFFICIENT_NOTCHES" };
  return { ok: true, cost };
}

export interface UpgradeCombatBonuses {
  playerDamageMultiplier: number;
  initialHpBonus: number;
  blindsightOnCorrectReduction: number;
  itemCooldownReduction: number;
  startingAmmoBonus: number;
}

export function computeUpgradeBonuses(
  levels: UpgradeLevels | undefined,
): UpgradeCombatBonuses {
  const fineLead = getUpgradeLevel(levels, "fine_lead");
  const leather = getUpgradeLevel(levels, "hardened_leather");
  const instinct = getUpgradeLevel(levels, "instinct");
  const hands = getUpgradeLevel(levels, "quick_hands");
  const powder = getUpgradeLevel(levels, "extra_powder");

  return {
    playerDamageMultiplier: 1 + fineLead * 0.1,
    initialHpBonus: leather * 5,
    blindsightOnCorrectReduction: instinct * 2,
    itemCooldownReduction: hands,
    startingAmmoBonus: powder,
  };
}

export function upgradesToModifiers(
  levels: UpgradeLevels | undefined,
  enabled: boolean,
): DuelModifiers {
  if (!enabled) return {};
  const b = computeUpgradeBonuses(levels);
  return {
    playerDamageMultiplier: b.playerDamageMultiplier,
    blindsightOnCorrectReduction: b.blindsightOnCorrectReduction,
  };
}

export function applyPlayerUpgradesToConfig(
  config: DuelConfig,
  levels: UpgradeLevels | undefined,
): DuelConfig {
  if (!upgradesEnabledForMode(config.mode)) return config;
  const bonuses = computeUpgradeBonuses(levels);
  const upgradeMods = upgradesToModifiers(levels, true);
  const existing = config.modifiers ?? {};
  return {
    ...config,
    initialPlayerHp: config.initialPlayerHp + bonuses.initialHpBonus,
    startingAmmoBonus: bonuses.startingAmmoBonus,
    itemCooldownReduction: bonuses.itemCooldownReduction,
    modifiers: {
      ...existing,
      playerDamageMultiplier:
        (existing.playerDamageMultiplier ?? 1) *
        (upgradeMods.playerDamageMultiplier ?? 1),
      blindsightOnCorrectReduction:
        (existing.blindsightOnCorrectReduction ?? 0) +
        (upgradeMods.blindsightOnCorrectReduction ?? 0),
    },
  };
}

export function previewPlayerDamage(levels: UpgradeLevels | undefined): number {
  const mult = computeUpgradeBonuses(levels).playerDamageMultiplier;
  return Math.round(COMBAT.HIT_DAMAGE * mult);
}

export function upgradesEnabledForMode(mode: string | undefined): boolean {
  return mode === "standard" || mode === "challenge";
}

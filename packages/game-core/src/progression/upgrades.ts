import { COMBAT, ITEM, READING } from "../constants/index.js";
import { isUpgradeUnlocked } from "./saloonProgression.js";
import { DuelConfig, DuelModifiers, WeaponId } from "../types/index.js";

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
    descEn: "+0.1 damage per shot each level (base shot ×1.0)",
    descEs: "+0.1 de daño por disparo por nivel (disparo base ×1.0)",
    maxLevel: 5,
    costs: [50, 100, 200, 350, 500],
  },
  hardened_leather: {
    id: "hardened_leather",
    nameEn: "Hardened Leather",
    nameEs: "Cuero endurecido",
    descEn: "+1 extra hit before empty (same 5 life slots)",
    descEs: "+1 golpe extra antes de quedar sin vidas (5 slots)",
    maxLevel: 3,
    costs: [40, 80, 150],
  },
  instinct: {
    id: "instinct",
    nameEn: "Instinct",
    nameEs: "Instinto",
    descEn: "+1 read before DEADEYE per level",
    descEs: "+1 lectura extra antes de DEADEYE por nivel",
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
  if (!isUpgradeUnlocked(id, levels)) return { ok: false, reason: "LOCKED" };
  const def = UPGRADE_DEFINITIONS[id];
  if (def.minPlayerLevel && playerLevel < def.minPlayerLevel) {
    return { ok: false, reason: "LEVEL_REQUIRED" };
  }
  if (notches < cost) return { ok: false, reason: "INSUFFICIENT_NOTCHES" };
  return { ok: true, cost };
}

export const LIFE_SLOT_COUNT = 5;

export interface UpgradeCombatBonuses {
  playerDamageMultiplier: number;
  initialHpBonus: number;
  deadeyeStreakBonus: number;
  itemCooldownReduction: number;
  startingAmmoBonus: number;
}

export function damageToLifeSlots(
  damage: number,
  maxHp: number,
  slots = LIFE_SLOT_COUNT,
): number {
  if (damage <= 0) return 0;
  const perLife = maxHp / slots;
  return Math.max(1, Math.ceil(damage / perLife));
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
    initialHpBonus: leather * COMBAT.HIT_DAMAGE,
    deadeyeStreakBonus: instinct,
    itemCooldownReduction: hands,
    startingAmmoBonus: powder,
  };
}

export interface SaloonPreviewStats {
  lifeSlots: number;
  maxHits: number;
  shotDamage: number;
  shotSlotsLost: number;
  deadeyeAfterReads: number;
  itemCooldownRounds: number;
  extraAmmo: number;
}

export function getItemCooldownRounds(
  config: Pick<DuelConfig, "itemCooldownReduction">,
): number {
  return Math.max(
    1,
    ITEM.COOLDOWN_ROUNDS - (config.itemCooldownReduction ?? 0),
  );
}

export function previewSaloonStatsFromConfig(
  config: DuelConfig,
): SaloonPreviewStats {
  const maxHp = config.initialPlayerHp;
  const deadeyeBonus = config.modifiers?.deadeyeStreakBonus ?? 0;
  const dmgMult = config.modifiers?.playerDamageMultiplier ?? 1;
  const shotDamage = Math.round(COMBAT.HIT_DAMAGE * dmgMult);
  return {
    lifeSlots: LIFE_SLOT_COUNT,
    maxHits: Math.ceil(maxHp / COMBAT.HIT_DAMAGE),
    shotDamage,
    shotSlotsLost: damageToLifeSlots(shotDamage, COMBAT.INITIAL_HP),
    deadeyeAfterReads: READING.DEADEYE_STREAK + deadeyeBonus,
    itemCooldownRounds: getItemCooldownRounds(config),
    extraAmmo: config.startingAmmoBonus ?? 0,
  };
}

export function previewSaloonStats(
  levels: UpgradeLevels | undefined,
): SaloonPreviewStats {
  const bonuses = computeUpgradeBonuses(levels);
  return previewSaloonStatsFromConfig({
    maxRounds: 999,
    initialPlayerHp: COMBAT.INITIAL_HP + bonuses.initialHpBonus,
    initialZegonHp: COMBAT.INITIAL_HP,
    weapon: WeaponId.REVOLVER,
    mode: "standard",
    startingAmmoBonus: bonuses.startingAmmoBonus,
    itemCooldownReduction: bonuses.itemCooldownReduction,
    modifiers: upgradesToModifiers(levels, true),
  });
}

export function hasActiveUpgrades(config: DuelConfig): boolean {
  return (
    config.initialPlayerHp > COMBAT.INITIAL_HP ||
    (config.modifiers?.playerDamageMultiplier ?? 1) > 1 ||
    (config.modifiers?.deadeyeStreakBonus ?? 0) > 0 ||
    (config.itemCooldownReduction ?? 0) > 0 ||
    (config.startingAmmoBonus ?? 0) > 0
  );
}

export function upgradesToModifiers(
  levels: UpgradeLevels | undefined,
  enabled: boolean,
): DuelModifiers {
  if (!enabled) return {};
  const b = computeUpgradeBonuses(levels);
  return {
    playerDamageMultiplier: b.playerDamageMultiplier,
    deadeyeStreakBonus: b.deadeyeStreakBonus,
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
      deadeyeStreakBonus:
        (existing.deadeyeStreakBonus ?? 0) +
        (upgradeMods.deadeyeStreakBonus ?? 0),
    },
  };
}

export function previewPlayerDamage(levels: UpgradeLevels | undefined): number {
  const mult = computeUpgradeBonuses(levels).playerDamageMultiplier;
  return Math.round(COMBAT.HIT_DAMAGE * mult);
}

export function upgradesEnabledForMode(mode: string | undefined): boolean {
  return mode === "standard" || mode === "challenge" || mode === "daily";
}

import { COMBAT } from "../constants/index.js";
import { DuelConfig } from "../types/index.js";
import {
  applyPlayerUpgradesToConfig,
  type UpgradeLevels,
  upgradesEnabledForMode,
} from "./upgrades.js";
import { isUpgradeUnlocked } from "./saloonProgression.js";

export type SaloonRelicId = "bounty_mark" | "nitro_caps" | "adrenaline";

/** Inventory stacks — each purchase adds one single-use charge. */
export type SaloonConsumableInventory = Partial<Record<SaloonRelicId, number>>;

export interface SaloonRelicDefinition {
  id: SaloonRelicId;
  nameEn: string;
  nameEs: string;
  descEn: string;
  descEs: string;
  icon: string;
  cost: number;
  minPlayerLevel?: number;
  /** Must max this upgrade before the satchel item appears in shop. */
  unlockAfterUpgrade?: import("./upgrades.js").UpgradeId;
}

export const RELIC_DEFINITIONS: Record<SaloonRelicId, SaloonRelicDefinition> = {
  bounty_mark: {
    id: "bounty_mark",
    nameEn: "Bounty Mark",
    nameEs: "Marca de recompensa",
    descEn: "Single duel: ZEGON starts wounded (−2 life slots). Consumed on use.",
    descEs: "Un duelo: ZEGON empieza herido (−2 slots). Se consume al usar.",
    icon: "☠",
    cost: 120,
    unlockAfterUpgrade: "instinct",
  },
  nitro_caps: {
    id: "nitro_caps",
    nameEn: "Nitro Caps",
    nameEs: "Cápsulas de nitro",
    descEn: "Single duel: +4 shot damage every connect. Consumed on use.",
    descEs: "Un duelo: +4 daño por disparo. Se consume al usar.",
    icon: "💥",
    cost: 160,
    minPlayerLevel: 2,
    unlockAfterUpgrade: "quick_hands",
  },
  adrenaline: {
    id: "adrenaline",
    nameEn: "Adrenaline",
    nameEs: "Adrenalina",
    descEn: "Single duel: DEADEYE triggers 1 read earlier. Consumed on use.",
    descEs: "Un duelo: DEADEYE 1 lectura antes. Se consume al usar.",
    icon: "⚡",
    cost: 200,
    minPlayerLevel: 3,
    unlockAfterUpgrade: "extra_powder",
  },
};

export const RELIC_ORDER: SaloonRelicId[] = [
  "bounty_mark",
  "nitro_caps",
  "adrenaline",
];

const BOUNTY_HP_PENALTY = COMBAT.HIT_DAMAGE * 2;
const NITRO_FLAT_DAMAGE = 4;
const MAX_STACK = 99;

/** @deprecated use SaloonConsumableInventory */
export type SaloonRelicLevels = SaloonConsumableInventory;

export function getConsumableCount(
  inventory: SaloonConsumableInventory | undefined,
  id: SaloonRelicId,
): number {
  return Math.min(MAX_STACK, Math.max(0, inventory?.[id] ?? 0));
}

/** @deprecated */
export function getRelicLevel(
  levels: SaloonConsumableInventory | undefined,
  id: SaloonRelicId,
): number {
  return getConsumableCount(levels, id);
}

export function getRelicCost(id: SaloonRelicId): number {
  return RELIC_DEFINITIONS[id].cost;
}

/** @deprecated always returns cost if unlocked */
export function getRelicCostLegacy(_id: SaloonRelicId, _currentLevel: number): number | null {
  return null;
}

export function isConsumableUnlocked(
  id: SaloonRelicId,
  upgrades: UpgradeLevels | undefined,
): boolean {
  const gate = RELIC_DEFINITIONS[id].unlockAfterUpgrade;
  if (!gate) return true;
  return isUpgradeUnlocked(gate, upgrades);
}

export function canPurchaseConsumable(
  id: SaloonRelicId,
  inventory: SaloonConsumableInventory | undefined,
  upgrades: UpgradeLevels | undefined,
  notches: number,
  playerLevel: number,
): { ok: true; cost: number } | { ok: false; reason: string } {
  const def = RELIC_DEFINITIONS[id];
  if (!isConsumableUnlocked(id, upgrades)) return { ok: false, reason: "LOCKED" };
  if (def.minPlayerLevel && playerLevel < def.minPlayerLevel) {
    return { ok: false, reason: "LEVEL_REQUIRED" };
  }
  const count = getConsumableCount(inventory, id);
  if (count >= MAX_STACK) return { ok: false, reason: "MAX_STACK" };
  if (notches < def.cost) return { ok: false, reason: "INSUFFICIENT_NOTCHES" };
  return { ok: true, cost: def.cost };
}

/** @deprecated */
export function canPurchaseRelic(
  id: SaloonRelicId,
  inventory: SaloonConsumableInventory | undefined,
  notches: number,
  playerLevel: number,
): { ok: true; cost: number } | { ok: false; reason: string } {
  return canPurchaseConsumable(id, inventory, {}, notches, playerLevel);
}

export function hasEquippedConsumable(
  equipped: SaloonRelicId | null | undefined,
  inventory: SaloonConsumableInventory | undefined,
): boolean {
  if (!equipped) return false;
  return getConsumableCount(inventory, equipped) > 0;
}

export function relicBadgeLabels(
  equipped: SaloonRelicId | null | undefined,
  lang: "en" | "es",
): string[] {
  if (!equipped) return [];
  const labels: string[] = [];
  if (equipped === "bounty_mark") {
    labels.push(lang === "es" ? "ZEGON −2 slots (1 duelo)" : "ZEGON −2 slots (1 duel)");
  }
  if (equipped === "nitro_caps") {
    labels.push(lang === "es" ? `+${NITRO_FLAT_DAMAGE} dmg (1 duelo)` : `+${NITRO_FLAT_DAMAGE} dmg (1 duel)`);
  }
  if (equipped === "adrenaline") {
    labels.push(lang === "es" ? "DEADEYE −1 lectura (1 duelo)" : "DEADEYE −1 read (1 duel)");
  }
  return labels;
}

export function applyEquippedConsumableToConfig(
  config: DuelConfig,
  equipped: SaloonRelicId | null | undefined,
): DuelConfig {
  if (!equipped) return config;

  let next = { ...config, modifiers: { ...config.modifiers } };
  const existing = next.modifiers ?? {};

  if (equipped === "bounty_mark") {
    next = {
      ...next,
      initialZegonHp: Math.max(
        COMBAT.HIT_DAMAGE * 2,
        next.initialZegonHp - BOUNTY_HP_PENALTY,
      ),
    };
  }

  if (equipped === "nitro_caps") {
    const baseMult = existing.playerDamageMultiplier ?? 1;
    const flatBonus = NITRO_FLAT_DAMAGE / COMBAT.HIT_DAMAGE;
    next = {
      ...next,
      modifiers: {
        ...existing,
        playerDamageMultiplier: baseMult + flatBonus,
      },
    };
  }

  if (equipped === "adrenaline") {
    next = {
      ...next,
      modifiers: {
        ...next.modifiers,
        deadeyeStreakBonus: (next.modifiers?.deadeyeStreakBonus ?? 0) - 1,
      },
    };
  }

  return next;
}

/** @deprecated */
export function applySaloonRelicsToConfig(
  config: DuelConfig,
  equippedOrInventory: SaloonConsumableInventory | undefined,
): DuelConfig {
  if (!equippedOrInventory) return config;
  const equipped = RELIC_ORDER.find((id) => getConsumableCount(equippedOrInventory, id) > 0);
  return applyEquippedConsumableToConfig(config, equipped ?? null);
}

export function applySaloonLoadoutToConfig(
  config: DuelConfig,
  upgrades: UpgradeLevels | undefined,
  equippedConsumable: SaloonRelicId | null | undefined,
): DuelConfig {
  const withUpgrades = upgradesEnabledForMode(config.mode)
    ? applyPlayerUpgradesToConfig(config, upgrades)
    : config;
  return saloonRelicsEnabledForMode(config.mode)
    ? applyEquippedConsumableToConfig(withUpgrades, equippedConsumable)
    : withUpgrades;
}

export function previewEquippedConsumableEffect(
  equipped: SaloonRelicId | null | undefined,
  lang: "en" | "es",
): string[] {
  return relicBadgeLabels(equipped, lang);
}

/** @deprecated */
export function previewRelicEffects(
  inventory: SaloonConsumableInventory | undefined,
  lang: "en" | "es",
): string[] {
  const equipped = RELIC_ORDER.find((id) => getConsumableCount(inventory, id) > 0);
  return previewEquippedConsumableEffect(equipped ?? null, lang);
}

/** @deprecated */
export function hasActiveRelics(inventory: SaloonConsumableInventory | undefined): boolean {
  return RELIC_ORDER.some((id) => getConsumableCount(inventory, id) > 0);
}

export function saloonRelicsEnabledForMode(mode: string | undefined): boolean {
  return mode === "standard" || mode === "challenge" || mode === "daily";
}

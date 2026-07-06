import {
  getUpgradeLevel,
  UPGRADE_DEFINITIONS,
  type UpgradeId,
  type UpgradeLevels,
} from "./upgrades.js";

export interface UnlockRequirement {
  upgradeId: UpgradeId;
  /** Parent must be at max level before this node opens. */
  mustBeMax: boolean;
}

/** Skill-tree gates — conjoint nodes require ALL parents maxed. */
export const UPGRADE_UNLOCK_REQUIREMENTS: Partial<
  Record<UpgradeId, UnlockRequirement[]>
> = {
  instinct: [{ upgradeId: "fine_lead", mustBeMax: true }],
  quick_hands: [{ upgradeId: "hardened_leather", mustBeMax: true }],
  extra_powder: [
    { upgradeId: "instinct", mustBeMax: true },
    { upgradeId: "quick_hands", mustBeMax: true },
  ],
};

export function requirementMet(
  req: UnlockRequirement,
  levels: UpgradeLevels | undefined,
): boolean {
  const level = getUpgradeLevel(levels, req.upgradeId);
  const max = UPGRADE_DEFINITIONS[req.upgradeId].maxLevel;
  return req.mustBeMax ? level >= max : level > 0;
}

export function isUpgradeUnlocked(
  id: UpgradeId,
  levels: UpgradeLevels | undefined,
): boolean {
  const reqs = UPGRADE_UNLOCK_REQUIREMENTS[id];
  if (!reqs?.length) return true;
  return reqs.every((r) => requirementMet(r, levels));
}

export function missingUnlockRequirements(
  id: UpgradeId,
  levels: UpgradeLevels | undefined,
): UnlockRequirement[] {
  const reqs = UPGRADE_UNLOCK_REQUIREMENTS[id] ?? [];
  return reqs.filter((r) => !requirementMet(r, levels));
}

export function upgradeTreeConnections(): Array<{
  from: UpgradeId | "root";
  to: UpgradeId;
}> {
  return [
    { from: "root", to: "fine_lead" },
    { from: "root", to: "hardened_leather" },
    { from: "fine_lead", to: "instinct" },
    { from: "hardened_leather", to: "quick_hands" },
    { from: "instinct", to: "extra_powder" },
    { from: "quick_hands", to: "extra_powder" },
  ];
}

export function connectionUnlocked(
  from: UpgradeId | "root",
  _to: UpgradeId,
  levels: UpgradeLevels | undefined,
): boolean {
  if (from === "root") return true;
  const max = UPGRADE_DEFINITIONS[from].maxLevel;
  return getUpgradeLevel(levels, from) >= max;
}

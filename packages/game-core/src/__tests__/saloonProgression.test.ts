import { describe, expect, it } from "vitest";
import {
  connectionUnlocked,
  isUpgradeUnlocked,
  missingUnlockRequirements,
} from "../progression/saloonProgression.js";
import { UPGRADE_DEFINITIONS } from "../progression/upgrades.js";

function maxLevel(id: keyof typeof UPGRADE_DEFINITIONS): number {
  return UPGRADE_DEFINITIONS[id].maxLevel;
}

describe("saloonProgression unlock gates", () => {
  it("opens tier-1 nodes from root without prerequisites", () => {
    expect(isUpgradeUnlocked("fine_lead", {})).toBe(true);
    expect(isUpgradeUnlocked("hardened_leather", {})).toBe(true);
  });

  it("requires fine_lead max before instinct", () => {
    expect(isUpgradeUnlocked("instinct", { fine_lead: maxLevel("fine_lead") - 1 })).toBe(
      false,
    );
    expect(isUpgradeUnlocked("instinct", { fine_lead: maxLevel("fine_lead") })).toBe(true);
  });

  it("requires hardened_leather max before quick_hands", () => {
    expect(
      isUpgradeUnlocked("quick_hands", { hardened_leather: maxLevel("hardened_leather") - 1 }),
    ).toBe(false);
    expect(
      isUpgradeUnlocked("quick_hands", { hardened_leather: maxLevel("hardened_leather") }),
    ).toBe(true);
  });

  it("requires BOTH instinct and quick_hands max for extra_powder", () => {
    const instinctMax = { instinct: maxLevel("instinct") };
    const quickMax = { quick_hands: maxLevel("quick_hands") };
    expect(isUpgradeUnlocked("extra_powder", instinctMax)).toBe(false);
    expect(isUpgradeUnlocked("extra_powder", quickMax)).toBe(false);
    expect(isUpgradeUnlocked("extra_powder", { ...instinctMax, ...quickMax })).toBe(true);
    expect(missingUnlockRequirements("extra_powder", instinctMax)).toHaveLength(1);
  });

  it("lights connection lines only when parent is maxed", () => {
    expect(connectionUnlocked("root", "fine_lead", {})).toBe(true);
    expect(connectionUnlocked("fine_lead", "instinct", { fine_lead: 1 })).toBe(false);
    expect(
      connectionUnlocked("fine_lead", "instinct", { fine_lead: maxLevel("fine_lead") }),
    ).toBe(true);
  });
});

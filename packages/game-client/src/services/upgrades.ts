import type { UpgradeId, UpgradeLevels, SaloonRelicId } from "@zegon/game-core";
import { getCachedProfile, mergeRemoteProfile, type PlayerProfile } from "./profile.js";
import { withSiweAuth } from "./siwe.js";

function applyPurchaseProfile(address: string, profile: PlayerProfile): void {
  mergeRemoteProfile(address, profile);
}

export async function purchaseUpgradeOnServer(
  address: string,
  upgradeId: UpgradeId,
): Promise<boolean> {
  try {
    const payload = await withSiweAuth({ address, upgradeId });
    const res = await fetch("/api/player/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { profile?: PlayerProfile };
    if (data.profile) {
      applyPurchaseProfile(address, data.profile);
    }
    return true;
  } catch {
    return false;
  }
}

export async function purchaseRelicOnServer(
  address: string,
  relicId: SaloonRelicId,
): Promise<boolean> {
  try {
    const payload = await withSiweAuth({ address, relicId });
    const res = await fetch("/api/player/relic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { profile?: PlayerProfile };
    if (data.profile) {
      applyPurchaseProfile(address, data.profile);
    }
    return true;
  } catch {
    return false;
  }
}

export async function equipConsumableOnServer(
  address: string,
  relicId: SaloonRelicId | null,
): Promise<boolean> {
  try {
    const payload = await withSiweAuth({ address, relicId });
    const res = await fetch("/api/player/equip-consumable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { profile?: PlayerProfile };
    if (data.profile) applyPurchaseProfile(address, data.profile);
    return true;
  } catch {
    return false;
  }
}

export async function consumeEquippedOnServer(address: string): Promise<boolean> {
  try {
    const payload = await withSiweAuth({ address });
    const res = await fetch("/api/player/consume-equipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { profile?: PlayerProfile };
    if (data.profile) applyPurchaseProfile(address, data.profile);
    return true;
  } catch {
    return false;
  }
}

export function getLocalUpgrades(address: string | null): UpgradeLevels {
  if (!address) return {};
  return getCachedProfile(address)?.upgrades ?? {};
}

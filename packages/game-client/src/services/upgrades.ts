import type { UpgradeId, UpgradeLevels, SaloonRelicId } from "@zegon/game-core";
import { getCachedProfile } from "./profile.js";
import { withSiweAuth } from "./siwe.js";

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
    const data = (await res.json()) as { profile?: ReturnType<typeof getCachedProfile> };
    if (data.profile) {
      localStorage.setItem(
        `zegon-profile-${address.toLowerCase()}`,
        JSON.stringify(data.profile),
      );
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
    const data = (await res.json()) as { profile?: ReturnType<typeof getCachedProfile> };
    if (data.profile) {
      localStorage.setItem(
        `zegon-profile-${address.toLowerCase()}`,
        JSON.stringify(data.profile),
      );
    }
    return true;
  } catch {
    return false;
  }
}

function cacheProfile(address: string, profile: ReturnType<typeof getCachedProfile>): void {
  if (!profile) return;
  localStorage.setItem(`zegon-profile-${address.toLowerCase()}`, JSON.stringify(profile));
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
    const data = (await res.json()) as { profile?: ReturnType<typeof getCachedProfile> };
    if (data.profile) cacheProfile(address, data.profile);
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
    const data = (await res.json()) as { profile?: ReturnType<typeof getCachedProfile> };
    if (data.profile) cacheProfile(address, data.profile);
    return true;
  } catch {
    return false;
  }
}

export function getLocalUpgrades(address: string | null): UpgradeLevels {
  if (!address) return {};
  return getCachedProfile(address)?.upgrades ?? {};
}

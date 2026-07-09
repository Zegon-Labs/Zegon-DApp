import type { CharacterGender } from "@zegon/game-core";
import { mergeRemoteProfile, type PlayerProfile } from "./profile.js";
import { withSiweAuth } from "./siwe.js";
import type { Language } from "../i18n/index.js";

async function postGunslinger<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; reason?: string; data?: T }> {
  try {
    const res = await fetch(`/api/player/gunslinger/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      accepted?: boolean;
      reason?: string;
      profile?: PlayerProfile;
      mint?: unknown;
    };
    if (res.ok && body.accepted !== false) {
      return { ok: true, data: body as T };
    }
    return { ok: false, reason: body.reason ?? `HTTP_${res.status}` };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

export async function evaluateGunslinger(
  address: string,
  lang: Language,
  manual = true,
): Promise<{ ok: boolean; profile?: PlayerProfile; reason?: string }> {
  const payload = await withSiweAuth({ address, lang, manual: manual || undefined });
  const res = await postGunslinger<{ profile: PlayerProfile }>("evaluate", payload);
  if (res.ok && res.data?.profile) {
    mergeRemoteProfile(address, res.data.profile);
    return { ok: true, profile: res.data.profile };
  }
  return { ok: false, reason: res.reason };
}

export async function setGunslingerGender(
  address: string,
  characterGender: CharacterGender,
): Promise<{ ok: boolean; profile?: PlayerProfile; reason?: string }> {
  const payload = await withSiweAuth({ address, characterGender });
  const res = await postGunslinger<{ profile: PlayerProfile }>("preference", payload);
  if (res.ok && res.data?.profile) {
    mergeRemoteProfile(address, res.data.profile);
    return { ok: true, profile: res.data.profile };
  }
  return { ok: false, reason: res.reason };
}

export async function mintGunslingerNft(
  address: string,
  lang: Language,
): Promise<{
  ok: boolean;
  profile?: PlayerProfile;
  mint?: { txHash: string; explorerUrl: string; updated: boolean };
  reason?: string;
}> {
  const payload = await withSiweAuth({ address, lang });
  const res = await postGunslinger<{
    profile: PlayerProfile;
    mint: { txHash: string; explorerUrl: string; updated: boolean };
  }>("mint", payload);
  if (res.ok && res.data?.profile) {
    mergeRemoteProfile(address, res.data.profile);
    return { ok: true, profile: res.data.profile, mint: res.data.mint };
  }
  return { ok: false, reason: res.reason };
}

export async function burnGunslingerNft(
  address: string,
): Promise<{
  ok: boolean;
  profile?: PlayerProfile;
  burn?: { txHash: string; explorerUrl: string; tokenId: string };
  reason?: string;
}> {
  const payload = await withSiweAuth({ address });
  const res = await postGunslinger<{
    profile: PlayerProfile;
    burn: { txHash: string; explorerUrl: string; tokenId: string };
  }>("burn", payload);
  if (res.ok && res.data?.profile) {
    mergeRemoteProfile(address, res.data.profile);
    return { ok: true, profile: res.data.profile, burn: res.data.burn };
  }
  return { ok: false, reason: res.reason };
}

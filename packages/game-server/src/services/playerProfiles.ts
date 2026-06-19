import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";

export interface PlayerProfile {
  address: string;
  nickname: string;
  createdAt: number;
  updatedAt: number;
}

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const DATA_FILE = join(leaderboardDir(), "profiles.json");

type ProfileStore = Record<string, PlayerProfile>;

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function isWalletAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function validateNickname(nickname: string): { ok: true } | { ok: false; error: string } {
  const trimmed = nickname.trim();
  if (!NICKNAME_RE.test(trimmed)) {
    return {
      ok: false,
      error: "Nickname must be 3–16 characters: letters, numbers, underscore.",
    };
  }
  return { ok: true };
}

async function loadStore(): Promise<ProfileStore> {
  try {
    await mkdir(leaderboardDir(), { recursive: true });
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ProfileStore;
  } catch {
    return {};
  }
}

async function saveStore(store: ProfileStore): Promise<void> {
  await mkdir(leaderboardDir(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

export async function getProfile(address: string): Promise<PlayerProfile | null> {
  if (!isWalletAddress(address)) return null;
  const store = await loadStore();
  return store[normalizeAddress(address)] ?? null;
}

export async function setProfile(
  address: string,
  nickname: string,
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) {
    throw new Error("INVALID_ADDRESS");
  }
  const check = validateNickname(nickname);
  if (!check.ok) throw new Error(check.error);

  const key = normalizeAddress(address);
  const store = await loadStore();
  const now = Date.now();
  const existing = store[key];

  const profile: PlayerProfile = {
    address: key,
    nickname: nickname.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store[key] = profile;
  await saveStore(store);
  return profile;
}

export async function getNicknamesForAddresses(
  addresses: string[],
): Promise<Record<string, string>> {
  const store = await loadStore();
  const out: Record<string, string> = {};
  for (const addr of addresses) {
    const key = normalizeAddress(addr);
    const nick = store[key]?.nickname;
    if (nick) out[key] = nick;
  }
  return out;
}

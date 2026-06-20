import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";

export interface PlayerStats {
  duelsWon: number;
  duelsPlayed: number;
  bestDailyScore: number;
  timesReadTotal: number;
  streakDays: number;
  lastDailySeed?: string;
}

export interface DailyAttempt {
  submitted: boolean;
  score?: number;
  duelId?: string;
}

export interface PlayerProfile {
  address: string;
  nickname: string;
  createdAt: number;
  updatedAt: number;
  xp: number;
  level: number;
  stats: PlayerStats;
  unlocks: string[];
  achievements: string[];
  dailyAttempts: Record<string, DailyAttempt>;
}

const DEFAULT_STATS: PlayerStats = {
  duelsWon: 0,
  duelsPlayed: 0,
  bestDailyScore: 0,
  timesReadTotal: 0,
  streakDays: 0,
};

function normalizeProfile(raw: Partial<PlayerProfile> & { address: string; nickname: string }): PlayerProfile {
  const now = Date.now();
  return {
    address: raw.address,
    nickname: raw.nickname,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    xp: raw.xp ?? 0,
    level: raw.level ?? 1,
    stats: { ...DEFAULT_STATS, ...raw.stats },
    unlocks: raw.unlocks ?? [],
    achievements: raw.achievements ?? [],
    dailyAttempts: raw.dailyAttempts ?? {},
  };
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
  const raw = store[normalizeAddress(address)];
  if (!raw) return null;
  return normalizeProfile(raw);
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

  const profile: PlayerProfile = normalizeProfile({
    address: key,
    nickname: nickname.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    xp: existing?.xp,
    level: existing?.level,
    stats: existing?.stats,
    unlocks: existing?.unlocks,
    achievements: existing?.achievements,
    dailyAttempts: existing?.dailyAttempts,
  });

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

export async function updateProfileStats(
  address: string,
  update: {
    xpGain?: number;
    won?: boolean;
    timesRead?: number;
    dailyScore?: number;
    dailySeed?: string;
    newAchievements?: string[];
    newUnlocks?: string[];
    duelId?: string;
  },
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const key = normalizeAddress(address);
  const store = await loadStore();
  const existing = store[key];
  if (!existing) throw new Error("PROFILE_REQUIRED");

  const profile = normalizeProfile(existing);
  const now = Date.now();

  if (update.xpGain) {
    profile.xp += update.xpGain;
    profile.level = Math.floor(profile.xp / 500) + 1;
  }
  if (update.won !== undefined) {
    profile.stats.duelsPlayed += 1;
    if (update.won) profile.stats.duelsWon += 1;
  } else if (update.timesRead !== undefined) {
    profile.stats.duelsPlayed += 1;
  }
  if (update.timesRead !== undefined) {
    profile.stats.timesReadTotal += update.timesRead;
  }
  if (update.dailyScore !== undefined && update.dailySeed) {
    profile.stats.bestDailyScore = Math.max(
      profile.stats.bestDailyScore,
      update.dailyScore,
    );
    const prev = profile.dailyAttempts[update.dailySeed];
    profile.dailyAttempts[update.dailySeed] = {
      submitted: true,
      score: update.dailyScore,
      duelId: update.duelId ?? prev?.duelId,
    };
    if (profile.stats.lastDailySeed !== update.dailySeed) {
      const yesterday = profile.stats.lastDailySeed;
      if (yesterday && yesterday !== update.dailySeed) {
        profile.stats.streakDays += 1;
      } else if (!yesterday) {
        profile.stats.streakDays = 1;
      }
      profile.stats.lastDailySeed = update.dailySeed;
    }
  }
  if (update.newAchievements?.length) {
    const set = new Set(profile.achievements);
    for (const a of update.newAchievements) set.add(a);
    profile.achievements = [...set];
  }
  if (update.newUnlocks?.length) {
    const set = new Set(profile.unlocks);
    for (const u of update.newUnlocks) set.add(u);
    profile.unlocks = [...set];
  }
  profile.updatedAt = now;
  store[key] = profile;
  await saveStore(store);
  return profile;
}

export function hasDailyAttempt(profile: PlayerProfile, seed: string): boolean {
  return Boolean(profile.dailyAttempts[seed]?.submitted);
}

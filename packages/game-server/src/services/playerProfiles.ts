import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  canPurchaseUpgrade,
  getUpgradeLevel,
  type UpgradeId,
  type UpgradeLevels,
} from "@zegon/game-core";
import { getSql, isDatabaseConfigured } from "./db.js";
import {
  normalizeProfile,
  type DailyAttempt,
  type PlayerProfile,
  type PlayerStats,
} from "./profileTypes.js";
import { leaderboardDir } from "../utils/paths.js";

export type { PlayerProfile, PlayerStats, DailyAttempt };

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

async function loadJsonStore(): Promise<ProfileStore> {
  try {
    await mkdir(leaderboardDir(), { recursive: true });
    const raw = await readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ProfileStore;
    const out: ProfileStore = {};
    for (const [key, val] of Object.entries(parsed)) {
      out[key] = normalizeProfile({ ...val, address: key, nickname: val.nickname });
    }
    return out;
  } catch {
    return {};
  }
}

async function saveJsonStore(store: ProfileStore): Promise<void> {
  await mkdir(leaderboardDir(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

async function loadProfileFromDb(address: string): Promise<PlayerProfile | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT address, nickname, created_at, updated_at, xp, level, notches,
           upgrades, unlocks, achievements, daily_attempts, stats
    FROM players WHERE address = ${normalizeAddress(address)}
  `) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  return normalizeProfile({
    address: String(row.address),
    nickname: String(row.nickname),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    xp: Number(row.xp),
    level: Number(row.level),
    notches: Number(row.notches),
    upgrades: (row.upgrades ?? {}) as UpgradeLevels,
    unlocks: (row.unlocks ?? []) as string[],
    achievements: (row.achievements ?? []) as string[],
    dailyAttempts: (row.daily_attempts ?? {}) as Record<string, DailyAttempt>,
    stats: (row.stats ?? {}) as Partial<PlayerStats>,
  });
}

async function saveProfileToDb(profile: PlayerProfile): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO players (
      address, nickname, created_at, updated_at, xp, level, notches,
      upgrades, unlocks, achievements, daily_attempts, stats
    ) VALUES (
      ${profile.address}, ${profile.nickname}, ${profile.createdAt}, ${profile.updatedAt},
      ${profile.xp}, ${profile.level}, ${profile.notches},
      ${JSON.stringify(profile.upgrades)}::jsonb,
      ${JSON.stringify(profile.unlocks)}::jsonb,
      ${JSON.stringify(profile.achievements)}::jsonb,
      ${JSON.stringify(profile.dailyAttempts)}::jsonb,
      ${JSON.stringify(profile.stats)}::jsonb
    )
    ON CONFLICT (address) DO UPDATE SET
      nickname = EXCLUDED.nickname,
      updated_at = EXCLUDED.updated_at,
      xp = EXCLUDED.xp,
      level = EXCLUDED.level,
      notches = EXCLUDED.notches,
      upgrades = EXCLUDED.upgrades,
      unlocks = EXCLUDED.unlocks,
      achievements = EXCLUDED.achievements,
      daily_attempts = EXCLUDED.daily_attempts,
      stats = EXCLUDED.stats
  `;
}

async function loadAllProfiles(): Promise<PlayerProfile[]> {
  if (isDatabaseConfigured()) {
    const sql = await getSql();
    if (sql) {
      const rows = (await sql`
        SELECT address, nickname, created_at, updated_at, xp, level, notches,
               upgrades, unlocks, achievements, daily_attempts, stats
        FROM players
      `) as Array<Record<string, unknown>>;
      return rows.map((row) =>
        normalizeProfile({
          address: String(row.address),
          nickname: String(row.nickname),
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          xp: Number(row.xp),
          level: Number(row.level),
          notches: Number(row.notches),
          upgrades: (row.upgrades ?? {}) as UpgradeLevels,
          unlocks: (row.unlocks ?? []) as string[],
          achievements: (row.achievements ?? []) as string[],
          dailyAttempts: (row.daily_attempts ?? {}) as Record<string, DailyAttempt>,
          stats: (row.stats ?? {}) as Partial<PlayerStats>,
        }),
      );
    }
  }
  const store = await loadJsonStore();
  return Object.values(store);
}

async function persistProfile(profile: PlayerProfile): Promise<void> {
  if (isDatabaseConfigured()) {
    await saveProfileToDb(profile);
  }
  const store = await loadJsonStore();
  store[profile.address] = profile;
  await saveJsonStore(store);
}

export async function getProfile(address: string): Promise<PlayerProfile | null> {
  if (!isWalletAddress(address)) return null;
  const key = normalizeAddress(address);
  if (isDatabaseConfigured()) {
    const fromDb = await loadProfileFromDb(key);
    if (fromDb) return fromDb;
  }
  const store = await loadJsonStore();
  const raw = store[key];
  if (!raw) return null;
  return normalizeProfile(raw);
}

export async function getProfileByNickname(nickname: string): Promise<PlayerProfile | null> {
  const profiles = await loadAllProfiles();
  return profiles.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase()) ?? null;
}

export async function setProfile(
  address: string,
  nickname: string,
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const check = validateNickname(nickname);
  if (!check.ok) throw new Error(check.error);

  const key = normalizeAddress(address);
  const existing = await getProfile(key);
  const now = Date.now();

  const profile = normalizeProfile({
    address: key,
    nickname: nickname.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    xp: existing?.xp,
    level: existing?.level,
    notches: existing?.notches,
    upgrades: existing?.upgrades,
    stats: existing?.stats,
    unlocks: existing?.unlocks,
    achievements: existing?.achievements,
    dailyAttempts: existing?.dailyAttempts,
  });

  await persistProfile(profile);
  return profile;
}

export async function getNicknamesForAddresses(
  addresses: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const addr of addresses) {
    const profile = await getProfile(addr);
    if (profile?.nickname) out[normalizeAddress(addr)] = profile.nickname;
  }
  return out;
}

export async function updateProfileStats(
  address: string,
  update: {
    xpGain?: number;
    notchesGain?: number;
    won?: boolean;
    timesRead?: number;
    roundsPlayed?: number;
    maxReadingStreak?: number;
    playTimeMs?: number;
    globalScore?: number;
    verifiedOnChain?: boolean;
    dailyScore?: number;
    dailySeed?: string;
    newAchievements?: string[];
    newUnlocks?: string[];
    duelId?: string;
    duelDay?: string;
  },
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const key = normalizeAddress(address);
  const existing = await getProfile(key);
  if (!existing) throw new Error("PROFILE_REQUIRED");

  const profile = normalizeProfile(existing);
  const now = Date.now();

  if (update.xpGain) {
    profile.xp += update.xpGain;
    profile.level = Math.floor(profile.xp / 500) + 1;
  }
  if (update.notchesGain) {
    profile.notches += update.notchesGain;
  }
  if (update.won !== undefined || update.timesRead !== undefined || update.roundsPlayed !== undefined) {
    profile.stats.duelsPlayed += 1;
    if (update.won) profile.stats.duelsWon += 1;
  }
  if (update.timesRead !== undefined) {
    profile.stats.timesReadTotal += update.timesRead;
  }
  if (update.roundsPlayed !== undefined) {
    profile.stats.totalRoundsPlayed += update.roundsPlayed;
  }
  if (update.maxReadingStreak !== undefined) {
    profile.stats.maxReadingStreak = Math.max(
      profile.stats.maxReadingStreak,
      update.maxReadingStreak,
    );
  }
  if (update.playTimeMs !== undefined) {
    profile.stats.totalPlayTimeMs += update.playTimeMs;
    if (update.won && (profile.stats.fastestWinMs === null || update.playTimeMs < profile.stats.fastestWinMs)) {
      profile.stats.fastestWinMs = update.playTimeMs;
    }
  }
  if (update.globalScore !== undefined) {
    profile.stats.bestGlobalScore = Math.max(profile.stats.bestGlobalScore, update.globalScore);
  }
  if (update.verifiedOnChain) {
    profile.stats.verifiedDuels += 1;
  }
  if (update.duelDay) {
    profile.stats.lastDuelDay = update.duelDay;
  }
  if (update.dailyScore !== undefined && update.dailySeed) {
    profile.stats.bestDailyScore = Math.max(profile.stats.bestDailyScore, update.dailyScore);
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
  await persistProfile(profile);
  return profile;
}

export async function purchaseUpgrade(
  address: string,
  upgradeId: UpgradeId,
): Promise<PlayerProfile> {
  const profile = await getProfile(address);
  if (!profile) throw new Error("PROFILE_REQUIRED");

  const check = canPurchaseUpgrade(
    upgradeId,
    profile.upgrades,
    profile.notches,
    profile.level,
  );
  if (!check.ok) throw new Error(check.reason);

  const current = getUpgradeLevel(profile.upgrades, upgradeId);
  profile.notches -= check.cost;
  profile.upgrades = { ...profile.upgrades, [upgradeId]: current + 1 };
  profile.updatedAt = Date.now();
  await persistProfile(profile);
  return profile;
}

export function hasDailyAttempt(profile: PlayerProfile, seed: string): boolean {
  return Boolean(profile.dailyAttempts[seed]?.submitted);
}

export async function listAllProfiles(): Promise<PlayerProfile[]> {
  return loadAllProfiles();
}

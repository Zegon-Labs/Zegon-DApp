import { join } from "node:path";
import {
  canPurchaseUpgrade,
  canPurchaseConsumable,
  getUpgradeLevel,
  getConsumableCount,
  GUNSLINGER_MAX_RECENT_DUELS,
  type UpgradeId,
  type UpgradeLevels,
  type SaloonRelicId,
  type SaloonRelicLevels,
  type CharacterGender,
} from "@zegon/game-core";
import { getSql, isDatabaseConfigured } from "./db.js";
import {
  normalizeProfile,
  type DailyAttempt,
  type GunslingerProfile,
  type PlayerProfile,
  type PlayerStats,
} from "./profileTypes.js";
import { leaderboardDir } from "../utils/paths.js";
import { loadPersistedJson, savePersistedJson } from "./jsonBlobStore.js";

export type { PlayerProfile, PlayerStats, DailyAttempt };

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const DATA_FILE = join(leaderboardDir(), "profiles.json");
const PROFILES_BLOB = "zegon/profiles.json";
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
  const parsed = await loadPersistedJson<ProfileStore>(PROFILES_BLOB, DATA_FILE);
  if (!parsed) return {};
  const out: ProfileStore = {};
  for (const [key, val] of Object.entries(parsed)) {
    out[key] = normalizeProfile({ ...val, address: key, nickname: val.nickname });
  }
  return out;
}

async function saveJsonStore(store: ProfileStore): Promise<void> {
  await savePersistedJson(PROFILES_BLOB, DATA_FILE, store);
}

async function loadProfileFromDb(address: string): Promise<PlayerProfile | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT address, nickname, created_at, updated_at, xp, level, notches,
           upgrades, relics, unlocks, achievements, daily_attempts, stats,
           gunslinger, recent_duel_ids
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
    relics: (row.relics ?? {}) as SaloonRelicLevels,
    unlocks: (row.unlocks ?? []) as string[],
    achievements: (row.achievements ?? []) as string[],
    dailyAttempts: (row.daily_attempts ?? {}) as Record<string, DailyAttempt>,
    stats: (row.stats ?? {}) as Partial<PlayerStats>,
    gunslinger: (row.gunslinger ?? null) as GunslingerProfile | null,
    recentDuelIds: (row.recent_duel_ids ?? []) as string[],
  });
}

async function saveProfileToDb(profile: PlayerProfile): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO players (
      address, nickname, created_at, updated_at, xp, level, notches,
      upgrades, relics, unlocks, achievements, daily_attempts, stats,
      gunslinger, recent_duel_ids
    ) VALUES (
      ${profile.address}, ${profile.nickname}, ${profile.createdAt}, ${profile.updatedAt},
      ${profile.xp}, ${profile.level}, ${profile.notches},
      ${JSON.stringify(profile.upgrades)}::jsonb,
      ${JSON.stringify(profile.relics ?? {})}::jsonb,
      ${JSON.stringify(profile.unlocks)}::jsonb,
      ${JSON.stringify(profile.achievements)}::jsonb,
      ${JSON.stringify(profile.dailyAttempts)}::jsonb,
      ${JSON.stringify(profile.stats)}::jsonb,
      ${profile.gunslinger ? JSON.stringify(profile.gunslinger) : null}::jsonb,
      ${JSON.stringify(profile.recentDuelIds ?? [])}::jsonb
    )
    ON CONFLICT (address) DO UPDATE SET
      nickname = EXCLUDED.nickname,
      updated_at = EXCLUDED.updated_at,
      xp = EXCLUDED.xp,
      level = EXCLUDED.level,
      notches = EXCLUDED.notches,
      upgrades = EXCLUDED.upgrades,
      relics = EXCLUDED.relics,
      unlocks = EXCLUDED.unlocks,
      achievements = EXCLUDED.achievements,
      daily_attempts = EXCLUDED.daily_attempts,
      stats = EXCLUDED.stats,
      gunslinger = EXCLUDED.gunslinger,
      recent_duel_ids = EXCLUDED.recent_duel_ids
  `;
}

async function loadAllProfiles(): Promise<PlayerProfile[]> {
  if (isDatabaseConfigured()) {
    const sql = await getSql();
    if (sql) {
      const rows = (await sql`
        SELECT address, nickname, created_at, updated_at, xp, level, notches,
               upgrades, relics, unlocks, achievements, daily_attempts, stats,
               gunslinger, recent_duel_ids
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
          gunslinger: (row.gunslinger ?? null) as GunslingerProfile | null,
          recentDuelIds: (row.recent_duel_ids ?? []) as string[],
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
    relics: existing?.relics,
    equippedConsumable: existing?.equippedConsumable,
    stats: existing?.stats,
    unlocks: existing?.unlocks,
    achievements: existing?.achievements,
    dailyAttempts: existing?.dailyAttempts,
    gunslinger: existing?.gunslinger,
    recentDuelIds: existing?.recentDuelIds,
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
    roundScoreGain?: number;
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
  if (update.roundScoreGain !== undefined) {
    profile.stats.totalRoundScore += update.roundScoreGain;
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
  if (update.duelId) {
    profile.recentDuelIds = appendRecentDuelId(profile.recentDuelIds ?? [], update.duelId);
  }
  profile.updatedAt = now;
  await persistProfile(profile);
  return profile;
}

function appendRecentDuelId(existing: string[], duelId: string): string[] {
  const id = duelId.trim();
  if (!id) return existing;
  const next = [id, ...existing.filter((d) => d !== id)];
  return next.slice(0, GUNSLINGER_MAX_RECENT_DUELS);
}

export async function appendPlayerDuelId(address: string, duelId: string): Promise<PlayerProfile | null> {
  if (!isWalletAddress(address) || !duelId.trim()) return null;
  const profile = await getProfile(normalizeAddress(address));
  if (!profile) return null;
  profile.recentDuelIds = appendRecentDuelId(profile.recentDuelIds ?? [], duelId);
  profile.updatedAt = Date.now();
  await persistProfile(profile);
  return profile;
}

export async function updateGunslingerProfile(
  address: string,
  patch: Partial<GunslingerProfile> & Pick<GunslingerProfile, "rank" | "bio" | "bioLang">,
  options?: { manual?: boolean; duelsPlayed?: number },
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const key = normalizeAddress(address);
  const existing = await getProfile(key);
  if (!existing) throw new Error("PROFILE_REQUIRED");

  const profile = normalizeProfile(existing);
  const prev = profile.gunslinger;
  const now = Date.now();
  profile.gunslinger = {
    rank: patch.rank,
    bio: patch.bio,
    bioLang: patch.bioLang,
    characterGender: patch.characterGender ?? prev?.characterGender ?? "man",
    evaluatedAt: patch.evaluatedAt ?? now,
    duelsAtEvaluation: patch.duelsAtEvaluation ?? options?.duelsPlayed ?? profile.stats.duelsPlayed,
    lastManualEvalAt: options?.manual ? now : patch.lastManualEvalAt ?? prev?.lastManualEvalAt,
    nft: patch.nft ?? prev?.nft,
  };
  profile.updatedAt = now;
  await persistProfile(profile);
  return profile;
}

export async function setGunslingerGender(
  address: string,
  characterGender: CharacterGender,
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const key = normalizeAddress(address);
  const existing = await getProfile(key);
  if (!existing) throw new Error("PROFILE_REQUIRED");

  const profile = normalizeProfile(existing);
  const prev = profile.gunslinger;
  profile.gunslinger = {
    rank: prev?.rank ?? 0,
    bio: prev?.bio ?? "",
    bioLang: prev?.bioLang ?? "en",
    characterGender,
    evaluatedAt: prev?.evaluatedAt ?? 0,
    duelsAtEvaluation: prev?.duelsAtEvaluation ?? 0,
    lastManualEvalAt: prev?.lastManualEvalAt,
    nft: prev?.nft,
  };
  profile.updatedAt = Date.now();
  await persistProfile(profile);
  return profile;
}

export async function saveGunslingerNft(
  address: string,
  nft: NonNullable<GunslingerProfile["nft"]>,
): Promise<PlayerProfile> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const key = normalizeAddress(address);
  const existing = await getProfile(key);
  if (!existing?.gunslinger) throw new Error("GUNSLINGER_REQUIRED");

  const profile = normalizeProfile(existing);
  profile.gunslinger = { ...profile.gunslinger!, nft };
  profile.updatedAt = Date.now();
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

export async function purchaseRelic(
  address: string,
  relicId: SaloonRelicId,
): Promise<PlayerProfile> {
  const profile = await getProfile(address);
  if (!profile) throw new Error("PROFILE_REQUIRED");

  const check = canPurchaseConsumable(
    relicId,
    profile.relics,
    profile.upgrades,
    profile.notches,
    profile.level,
  );
  if (!check.ok) throw new Error(check.reason);

  const current = getConsumableCount(profile.relics, relicId);
  profile.notches -= check.cost;
  profile.relics = { ...profile.relics, [relicId]: current + 1 };
  profile.updatedAt = Date.now();
  await persistProfile(profile);
  return profile;
}

export async function equipConsumable(
  address: string,
  relicId: SaloonRelicId | null,
): Promise<PlayerProfile> {
  const profile = await getProfile(address);
  if (!profile) throw new Error("PROFILE_REQUIRED");

  if (relicId && getConsumableCount(profile.relics, relicId) <= 0) {
    throw new Error("NO_CHARGES");
  }

  profile.equippedConsumable = relicId;
  profile.updatedAt = Date.now();
  await persistProfile(profile);
  return profile;
}

export async function consumeEquippedConsumable(
  address: string,
): Promise<PlayerProfile> {
  const profile = await getProfile(address);
  if (!profile) throw new Error("PROFILE_REQUIRED");

  const equipped = profile.equippedConsumable;
  if (!equipped) return profile;

  const left = getConsumableCount(profile.relics, equipped);
  if (left <= 0) {
    profile.equippedConsumable = null;
  } else {
    const next = left - 1;
    profile.relics = {
      ...profile.relics,
      [equipped]: next > 0 ? next : undefined,
    };
    if (next <= 0) profile.equippedConsumable = null;
  }
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

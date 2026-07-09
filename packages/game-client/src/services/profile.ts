import type { UpgradeLevels, SaloonRelicLevels, SaloonRelicId } from "@zegon/game-core";

export interface PlayerProfile {
  address: string;
  nickname: string;
  createdAt: number;
  updatedAt: number;
  xp?: number;
  level?: number;
  notches?: number;
  upgrades?: UpgradeLevels;
  relics?: SaloonRelicLevels;
  equippedConsumable?: SaloonRelicId | null;
  achievements?: string[];
  unlocks?: string[];
  stats?: {
    duelsWon: number;
    duelsPlayed: number;
    bestDailyScore: number;
    bestGlobalScore: number;
    timesReadTotal: number;
    totalRoundsPlayed: number;
    totalRoundScore: number;
    maxReadingStreak: number;
    totalPlayTimeMs: number;
    fastestWinMs: number | null;
    verifiedDuels: number;
    streakDays: number;
    lastDuelDay?: string;
  };
}

const NICKNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const cachePrefix = "zegon-profile-";

type ProfileListener = (address: string | null, profile: PlayerProfile | null) => void;
const listeners = new Set<ProfileListener>();

function notify(address: string | null, profile: PlayerProfile | null): void {
  for (const fn of listeners) fn(address, profile);
}

function cacheKey(address: string): string {
  return `${cachePrefix}${address.toLowerCase()}`;
}

export function validateNickname(nickname: string): { ok: true } | { ok: false; key: string } {
  const trimmed = nickname.trim();
  if (trimmed.length < 3 || trimmed.length > 16) {
    return { ok: false, key: "nicknameLength" };
  }
  if (!NICKNAME_RE.test(trimmed)) {
    return { ok: false, key: "nicknameChars" };
  }
  return { ok: true };
}

export function getCachedProfile(address: string): PlayerProfile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(address));
    return raw ? (JSON.parse(raw) as PlayerProfile) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: PlayerProfile): void {
  localStorage.setItem(cacheKey(profile.address), JSON.stringify(profile));
  notify(profile.address, profile);
}

export function hasNickname(address: string | null): boolean {
  if (!address) return false;
  return Boolean(getCachedProfile(address)?.nickname);
}

export async function fetchProfile(address: string): Promise<PlayerProfile | null> {
  try {
    const res = await fetch(
      `/api/player/profile?address=${encodeURIComponent(address)}`,
    );
    if (!res.ok) return getCachedProfile(address);
    const data = (await res.json()) as { profile: PlayerProfile | null };
    if (data.profile) {
      setCachedProfile(data.profile);
      return data.profile;
    }
    return null;
  } catch {
    return getCachedProfile(address);
  }
}

export async function saveProfile(
  address: string,
  nickname: string,
): Promise<PlayerProfile> {
  const check = validateNickname(nickname);
  if (!check.ok) throw new Error(check.key);

  const { withSiweAuth } = await import("./siwe.js");
  const payload = await withSiweAuth({ address, nickname: nickname.trim() });

  const res = await fetch("/api/player/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "SAVE_FAILED");
  }

  const data = (await res.json()) as { profile: PlayerProfile };
  setCachedProfile(data.profile);
  return data.profile;
}

const DEFAULT_STATS = {
  duelsWon: 0,
  duelsPlayed: 0,
  bestDailyScore: 0,
  bestGlobalScore: 0,
  timesReadTotal: 0,
  totalRoundsPlayed: 0,
  totalRoundScore: 0,
  maxReadingStreak: 0,
  totalPlayTimeMs: 0,
  fastestWinMs: null as number | null,
  verifiedDuels: 0,
  streakDays: 0,
};

export function recordLocalProgress(
  address: string,
  update: {
    won?: boolean;
    timesRead?: number;
    roundsPlayed?: number;
    maxReadingStreak?: number;
    xpGain?: number;
    notchesGain?: number;
    dailyScore?: number;
    globalScore?: number;
    roundScoreGain?: number;
    achievements?: readonly string[];
    unlocks?: readonly string[];
    lastDuelDay?: string;
    verifiedOnChain?: boolean;
    playTimeMs?: number;
  },
): PlayerProfile | null {
  const cached = getCachedProfile(address);
  if (!cached?.nickname) return null;

  const stats = { ...DEFAULT_STATS, ...cached.stats };
  if (update.won !== undefined || update.timesRead !== undefined || update.roundsPlayed !== undefined) {
    stats.duelsPlayed += 1;
    if (update.won) stats.duelsWon += 1;
  }
  if (update.timesRead !== undefined) {
    stats.timesReadTotal += update.timesRead;
  }
  if (update.roundsPlayed !== undefined) {
    stats.totalRoundsPlayed += update.roundsPlayed;
  }
  if (update.maxReadingStreak !== undefined) {
    stats.maxReadingStreak = Math.max(stats.maxReadingStreak, update.maxReadingStreak);
  }
  if (update.playTimeMs !== undefined) {
    stats.totalPlayTimeMs += update.playTimeMs;
    if (update.won && (stats.fastestWinMs === null || update.playTimeMs < stats.fastestWinMs)) {
      stats.fastestWinMs = update.playTimeMs;
    }
  }
  if (update.verifiedOnChain) {
    stats.verifiedDuels += 1;
  }
  if (update.lastDuelDay) {
    stats.lastDuelDay = update.lastDuelDay;
  }
  if (update.dailyScore !== undefined) {
    stats.bestDailyScore = Math.max(stats.bestDailyScore, update.dailyScore);
  }
  if (update.globalScore !== undefined) {
    stats.bestGlobalScore = Math.max(stats.bestGlobalScore, update.globalScore);
  }
  if (update.roundScoreGain !== undefined) {
    stats.totalRoundScore += update.roundScoreGain;
  }

  const achievements = new Set(cached.achievements ?? []);
  for (const a of update.achievements ?? []) achievements.add(a);
  const unlocks = new Set(cached.unlocks ?? []);
  for (const u of update.unlocks ?? []) unlocks.add(u);

  const xp = (cached.xp ?? 0) + (update.xpGain ?? 0);
  const next: PlayerProfile = {
    ...cached,
    xp,
    level: Math.floor(xp / 500) + 1,
    notches: (cached.notches ?? 0) + (update.notchesGain ?? 0),
    stats,
    achievements: [...achievements],
    unlocks: [...unlocks],
    updatedAt: Date.now(),
  };
  setCachedProfile(next);
  return next;
}

export function onProfileChange(listener: ProfileListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function displayNameFor(address: string, nickname?: string | null): string {
  if (nickname) return nickname;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function xpProgress(xp: number): { level: number; current: number; next: number; pct: number } {
  const level = Math.floor(xp / 500) + 1;
  const current = xp % 500;
  return { level, current, next: 500, pct: (current / 500) * 100 };
}

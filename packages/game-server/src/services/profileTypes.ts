import type { UpgradeLevels, SaloonRelicLevels, SaloonRelicId } from "@zegon/game-core";

export interface PlayerStats {
  duelsWon: number;
  duelsPlayed: number;
  bestDailyScore: number;
  bestGlobalScore: number;
  timesReadTotal: number;
  totalRoundsPlayed: number;
  maxReadingStreak: number;
  totalPlayTimeMs: number;
  fastestWinMs: number | null;
  verifiedDuels: number;
  streakDays: number;
  lastDailySeed?: string;
  lastDuelDay?: string;
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
  notches: number;
  upgrades: UpgradeLevels;
  relics: SaloonRelicLevels;
  equippedConsumable?: SaloonRelicId | null;
  stats: PlayerStats;
  unlocks: string[];
  achievements: string[];
  dailyAttempts: Record<string, DailyAttempt>;
}

export const DEFAULT_STATS: PlayerStats = {
  duelsWon: 0,
  duelsPlayed: 0,
  bestDailyScore: 0,
  bestGlobalScore: 0,
  timesReadTotal: 0,
  totalRoundsPlayed: 0,
  maxReadingStreak: 0,
  totalPlayTimeMs: 0,
  fastestWinMs: null,
  verifiedDuels: 0,
  streakDays: 0,
};

export function normalizeProfile(
  raw: Omit<Partial<PlayerProfile>, "stats"> & {
    address: string;
    nickname: string;
    stats?: Partial<PlayerStats>;
  },
): PlayerProfile {
  const now = Date.now();
  return {
    address: raw.address.toLowerCase(),
    nickname: raw.nickname,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    xp: raw.xp ?? 0,
    level: raw.level ?? 1,
    notches: raw.notches ?? 0,
    upgrades: raw.upgrades ?? {},
    relics: raw.relics ?? {},
    equippedConsumable: raw.equippedConsumable ?? null,
    stats: { ...DEFAULT_STATS, ...raw.stats },
    unlocks: raw.unlocks ?? [],
    achievements: raw.achievements ?? [],
    dailyAttempts: raw.dailyAttempts ?? {},
  };
}

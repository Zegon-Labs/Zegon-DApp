import { DuelResult, DuelWinner } from "../types/index.js";

export type AchievementId =
  | "first_blood"
  | "unreadable"
  | "ghost"
  | "verified_gunslinger"
  | "daily_champion";

export interface Achievement {
  id: AchievementId;
  nameEn: string;
  nameEs: string;
  descEn: string;
  descEs: string;
  unlockCosmetic?: string;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_blood: {
    id: "first_blood",
    nameEn: "First Blood",
    nameEs: "Primera Sangre",
    descEn: "Win your first duel against ZEGON",
    descEs: "Gana tu primer duelo contra ZEGON",
    unlockCosmetic: "frame_bronze",
  },
  unreadable: {
    id: "unreadable",
    nameEn: "Unreadable",
    nameEs: "Ilegible",
    descEn: "Win without being read once",
    descEs: "Gana sin que te lean ni una vez",
    unlockCosmetic: "revolver_cyan",
  },
  ghost: {
    id: "ghost",
    nameEn: "Ghost",
    nameEs: "Fantasma",
    descEn: "Surprise ZEGON 3 rounds in a row",
    descEs: "Sorprende a ZEGON 3 rondas seguidas",
  },
  verified_gunslinger: {
    id: "verified_gunslinger",
    nameEn: "Verified Gunslinger",
    nameEs: "Pistolero Verificado",
    descEn: "Complete a duel with on-chain verify",
    descEs: "Completa un duelo con verify on-chain",
    unlockCosmetic: "frame_verified",
  },
  daily_champion: {
    id: "daily_champion",
    nameEn: "Daily Champion",
    nameEs: "Campeón Diario",
    descEn: "Finish Top 3 on the daily board",
    descEs: "Termina Top 3 en el ranking diario",
    unlockCosmetic: "frame_gold",
  },
};

export interface AchievementCheckContext {
  result: DuelResult;
  surpriseStreak: number;
  verifiedOnChain?: boolean;
  dailyRank?: number;
}

export function checkAchievements(
  ctx: AchievementCheckContext,
  alreadyUnlocked: readonly string[],
): AchievementId[] {
  const unlocked = new Set(alreadyUnlocked);
  const earned: AchievementId[] = [];

  function grant(id: AchievementId): void {
    if (!unlocked.has(id)) {
      earned.push(id);
      unlocked.add(id);
    }
  }

  if (ctx.result.winner === DuelWinner.PLAYER) {
    grant("first_blood");
  }
  if (
    ctx.result.winner === DuelWinner.PLAYER &&
    ctx.result.timesRead === 0
  ) {
    grant("unreadable");
  }
  if (ctx.surpriseStreak >= 3) {
    grant("ghost");
  }
  if (ctx.verifiedOnChain) {
    grant("verified_gunslinger");
  }
  if (ctx.dailyRank !== undefined && ctx.dailyRank <= 3) {
    grant("daily_champion");
  }

  return earned;
}

export function xpForResult(result: DuelResult): number {
  let xp = result.roundsPlayed * 5 + Math.floor(result.score / 10);
  if (result.winner === DuelWinner.PLAYER) xp += 50;
  return xp;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function dailyStreakMultiplier(streakDays: number): number {
  const bonus = Math.min(5, Math.max(0, streakDays)) * 0.05;
  return 1 + bonus;
}

export function surpriseComboBonus(surpriseStreak: number): number {
  if (surpriseStreak >= 4) return 20;
  if (surpriseStreak === 3) return 12;
  if (surpriseStreak >= 2) return 8;
  return 0;
}

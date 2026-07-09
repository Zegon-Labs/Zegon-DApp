/** Gunslinger Rank 1–5 — distinct from account XP level. */

export type GunslingerRankLevel = 1 | 2 | 3 | 4 | 5;
export type CharacterGender = "man" | "woman";

export const GUNSLINGER_RANK_MIN = 1;
export const GUNSLINGER_RANK_MAX = 5;

export const GUNSLINGER_EVAL_MIN_DUELS = 3;
export const GUNSLINGER_EVAL_MIN_DUELS_SINCE_LAST = 3;
export const GUNSLINGER_MANUAL_EVAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const GUNSLINGER_AUTO_EVAL_DUEL_INTERVAL = 10;
export const GUNSLINGER_MAX_RECENT_DUELS = 15;

export interface GunslingerRankDef {
  rank: GunslingerRankLevel;
  nameEn: string;
  nameEs: string;
  portraitFileMan: string;
  portraitFileWoman: string;
  unlockHintEn: string;
  unlockHintEs: string;
}

export const GUNSLINGER_RANKS: readonly GunslingerRankDef[] = [
  {
    rank: 1,
    nameEn: "The Outsider",
    nameEs: "El Forastero",
    portraitFileMan: "The Outsider.png",
    portraitFileWoman: "The Outsider M.png",
    unlockHintEn: "Complete your first Gunslinger evaluation after a few duels.",
    unlockHintEs: "Completa tu primera evaluación de Gunslinger tras algunos duelos.",
  },
  {
    rank: 2,
    nameEn: "Powder Apprentice",
    nameEs: "Aprendiz de Pólvora",
    portraitFileMan: "Powder Apprentice.png",
    portraitFileWoman: "Powder Apprentice M.png",
    unlockHintEn: "Show consistency across multiple duels — ZEGON watches patterns, not luck.",
    unlockHintEs: "Mostrá consistencia en varios duelos — ZEGON observa patrones, no suerte.",
  },
  {
    rank: 3,
    nameEn: "Marksman",
    nameEs: "Tirador",
    portraitFileMan: "Marksman.png",
    portraitFileWoman: "Marksman M.png",
    unlockHintEn: "Surprise ZEGON often and keep your read rate low under pressure.",
    unlockHintEs: "Sorprendé a ZEGON seguido y mantené baja tu tasa de lectura bajo presión.",
  },
  {
    rank: 4,
    nameEn: "Veteran of the Blindfold",
    nameEs: "Veterano de la Venda",
    portraitFileMan: "Veteran of the Blindfold.png",
    portraitFileWoman: "Veteran of the Blindfold M.png",
    unlockHintEn: "Prove sustained skill across verified duels and deep streaks.",
    unlockHintEs: "Demostrá habilidad sostenida en duelos verificados y rachas profundas.",
  },
  {
    rank: 5,
    nameEn: "The Eyeless Legend",
    nameEs: "La Leyenda Sin Ojos",
    portraitFileMan: "The Eyeless Legend.png",
    portraitFileWoman: "The Eyeless Legend M.png",
    unlockHintEn: "Only the blind who truly outread the blind reach this rank.",
    unlockHintEs: "Solo quienes superan al ciego de verdad alcanzan este rango.",
  },
] as const;

export function clampGunslingerRank(value: number): GunslingerRankLevel {
  const n = Math.round(value);
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as GunslingerRankLevel;
}

/** Rank never decreases. */
export function rankMonotonicMerge(current: number, proposed: number): GunslingerRankLevel {
  return clampGunslingerRank(Math.max(current || 0, proposed || 0));
}

export function getGunslingerRankDef(rank: number): GunslingerRankDef {
  const level = clampGunslingerRank(rank || 1);
  return GUNSLINGER_RANKS[level - 1]!;
}

export function gunslingerRankName(rank: number, lang: "en" | "es"): string {
  const def = getGunslingerRankDef(rank);
  return lang === "es" ? def.nameEs : def.nameEn;
}

export function gunslingerUnlockHint(rank: number, lang: "en" | "es"): string {
  const def = getGunslingerRankDef(rank);
  return lang === "es" ? def.unlockHintEs : def.unlockHintEn;
}

/** Public URL path under game-client /public (spaces encoded). */
export function gunslingerPortraitPath(
  rank: number,
  gender: CharacterGender,
): string {
  const def = getGunslingerRankDef(rank);
  const folder = gender === "woman" ? "woman" : "man";
  const file = gender === "woman" ? def.portraitFileWoman : def.portraitFileMan;
  return `/character/${folder}/${encodeURIComponent(file)}`;
}

/** Server-side filesystem path segment (relative to game-client/public). */
export function gunslingerPortraitRelativePath(
  rank: number,
  gender: CharacterGender,
): string {
  const def = getGunslingerRankDef(rank);
  const folder = gender === "woman" ? "woman" : "man";
  const file = gender === "woman" ? def.portraitFileWoman : def.portraitFileMan;
  return `character/${folder}/${file}`;
}

export function canRequestManualGunslingerEval(
  duelsPlayed: number,
  gunslinger: {
    evaluatedAt?: number;
    duelsAtEvaluation?: number;
    lastManualEvalAt?: number;
  } | null | undefined,
  now = Date.now(),
): { ok: true } | { ok: false; reason: "NEED_DUELS" | "COOLDOWN" | "NEED_NEW_DUELS" } {
  if (duelsPlayed < GUNSLINGER_EVAL_MIN_DUELS) {
    return { ok: false, reason: "NEED_DUELS" };
  }
  if (!gunslinger?.evaluatedAt) {
    return { ok: true };
  }
  const duelsSince = duelsPlayed - (gunslinger.duelsAtEvaluation ?? 0);
  if (duelsSince < GUNSLINGER_EVAL_MIN_DUELS_SINCE_LAST) {
    return { ok: false, reason: "NEED_NEW_DUELS" };
  }
  if (
    gunslinger.lastManualEvalAt &&
    now - gunslinger.lastManualEvalAt < GUNSLINGER_MANUAL_EVAL_COOLDOWN_MS
  ) {
    return { ok: false, reason: "COOLDOWN" };
  }
  return { ok: true };
}

export function shouldAutoEvaluateGunslinger(
  duelsPlayed: number,
  gunslinger: { evaluatedAt?: number; duelsAtEvaluation?: number } | null | undefined,
): boolean {
  if (duelsPlayed < GUNSLINGER_EVAL_MIN_DUELS) return false;
  if (!gunslinger?.evaluatedAt) return duelsPlayed >= GUNSLINGER_EVAL_MIN_DUELS;
  const duelsSince = duelsPlayed - (gunslinger.duelsAtEvaluation ?? 0);
  return duelsSince >= GUNSLINGER_AUTO_EVAL_DUEL_INTERVAL;
}

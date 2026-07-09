import {
  analyzePlayerPattern,
  clampGunslingerRank,
  rankMonotonicMerge,
  PlayerAction,
  type RoundContext,
} from "@zegon/game-core";
import { loadDuelLogPayload } from "./storage.js";
import { runOGTextInference, parseJsonFromLLM } from "./ogComputeBroker.js";
import type { PlayerProfile } from "./profileTypes.js";

const SYSTEM_PROMPT = `You are ZEGON, the blind gunslinger oracle of the ZEGON duel game.
You judge a player's Gunslinger Rank (1-5) from their real duel history and stats.
Rank 1 = The Outsider (raw beginner), 5 = The Eyeless Legend (master who consistently outreads the blind).
Judge CONSISTENCY and demonstrated skill — not raw win count alone. Penalize predictable patterns and high read rates.
Return ONLY JSON:
{"proposed_rank":1-5,"bio":"second-person lore bio in the requested language, 2-4 sentences, based on their actual patterns"}
Use uppercase for nothing in bio. Bio must be second person ("You...").`;

interface DuelRoundLog {
  playerAction?: string;
  predictionCorrect?: boolean;
  itemUsed?: string;
}

interface DuelSummary {
  duelId: string;
  rounds: number;
  timesRead: number;
  readRate: number;
  actionMix: Record<string, number>;
  patternConfidence?: number;
}

export interface GunslingerEvalResult {
  rank: number;
  bio: string;
  proposedRank: number;
  source: "tee" | "heuristic";
}

function summarizeDuelLogs(duelId: string, logs: unknown[]): DuelSummary | null {
  const rounds = logs as DuelRoundLog[];
  if (!rounds.length) return null;

  const actionMix: Record<string, number> = {};
  let timesRead = 0;
  const actions: PlayerAction[] = [];

  for (const log of rounds) {
    const action = String(log.playerAction ?? "UNKNOWN");
    actionMix[action] = (actionMix[action] ?? 0) + 1;
    if (log.predictionCorrect) timesRead += 1;
    if (action === PlayerAction.FIRE || action === PlayerAction.DODGE || action === PlayerAction.USE_ITEM) {
      actions.push(action as PlayerAction);
    }
  }

  let patternConfidence: number | undefined;
  if (actions.length >= 3) {
    const ctx: RoundContext = {
      roundIndex: actions.length,
      playerHistory: actions.slice(0, -1),
      playerHp: 50,
      zegonHp: 50,
      weapon: "REVOLVER" as never,
      ammo: 6,
      blindsight: 0,
      readingStreak: 0,
      equippedItem: "SMOKE" as never,
      itemCooldown: 0,
      isDeadeye: false,
    };
    patternConfidence = analyzePlayerPattern(ctx, () => Math.random()).confidence;
  }

  const completed = rounds.filter((r) => r.playerAction).length;
  return {
    duelId,
    rounds: completed || rounds.length,
    timesRead,
    readRate: completed > 0 ? timesRead / completed : 0,
    actionMix,
    patternConfidence,
  };
}

async function loadDuelSummaries(duelIds: string[]): Promise<DuelSummary[]> {
  const out: DuelSummary[] = [];
  for (const id of duelIds.slice(0, 12)) {
    const payload = await loadDuelLogPayload(id);
    if (!payload?.logs?.length) continue;
    const summary = summarizeDuelLogs(id, payload.logs);
    if (summary) out.push(summary);
  }
  return out;
}

function buildUserPrompt(
  profile: PlayerProfile,
  duelSummaries: DuelSummary[],
  lang: "en" | "es",
): string {
  const s = profile.stats;
  const rounds = Math.max(1, s.totalRoundsPlayed);
  return JSON.stringify({
    language: lang,
    nickname: profile.nickname,
    current_rank: profile.gunslinger?.rank ?? 0,
    previous_bio: profile.gunslinger?.bio ?? "",
    aggregate_stats: {
      duels_won: s.duelsWon,
      duels_played: s.duelsPlayed,
      win_rate: s.duelsPlayed > 0 ? s.duelsWon / s.duelsPlayed : 0,
      times_read_total: s.timesReadTotal,
      total_rounds: s.totalRoundsPlayed,
      read_rate: s.timesReadTotal / rounds,
      ghost_avg: s.totalRoundScore / rounds,
      max_reading_streak: s.maxReadingStreak,
      verified_duels: s.verifiedDuels,
      fastest_win_ms: s.fastestWinMs,
    },
    recent_duels: duelSummaries,
    instruction:
      "Propose rank 1-5. Rank cannot exceed demonstrated skill. If recent performance is poor, bio may reflect a slump even if rank stays high.",
  });
}

function heuristicRank(profile: PlayerProfile, summaries: DuelSummary[]): number {
  const s = profile.stats;
  const rounds = Math.max(1, s.totalRoundsPlayed);
  const readRate = s.timesReadTotal / rounds;
  const winRate = s.duelsPlayed > 0 ? s.duelsWon / s.duelsPlayed : 0;
  const ghostAvg = s.totalRoundScore / rounds;

  let score = 1;
  if (s.duelsPlayed >= 5 && readRate < 0.45) score += 1;
  if (s.duelsPlayed >= 10 && winRate >= 0.45 && readRate < 0.4) score += 1;
  if (s.maxReadingStreak <= 2 && s.duelsPlayed >= 15 && ghostAvg > 0) score += 1;
  if (s.verifiedDuels >= 3 && winRate >= 0.5 && readRate < 0.35) score += 1;

  const avgPattern = summaries
    .map((d) => d.patternConfidence ?? 0.5)
    .reduce((a, b) => a + b, 0) / Math.max(1, summaries.length);
  if (avgPattern > 0.7 && readRate < 0.3) score = Math.min(5, score + 1);

  return clampGunslingerRank(score);
}

function heuristicBio(profile: PlayerProfile, rank: number, lang: "en" | "es"): string {
  const s = profile.stats;
  const rounds = Math.max(1, s.totalRoundsPlayed);
  const readRate = Math.round((s.timesReadTotal / rounds) * 100);
  if (lang === "es") {
    return `Has sobrevivido ${s.duelsPlayed} duelos contra el ciego. ZEGON te leyó en ~${readRate}% de tus rondas — ${
      rank >= 3
        ? "a veces rompés el patrón cuando más importa."
        : "todavía dejás huellas que el vendado puede seguir."
    }`;
  }
  return `You have survived ${s.duelsPlayed} duels against the blind. ZEGON read you in ~${readRate}% of your rounds — ${
    rank >= 3
      ? "you break the pattern when it matters most."
      : "you still leave tracks the blindfold can follow."
  }`;
}

function parseEvalResponse(
  raw: string,
): { proposedRank: number; bio: string } | null {
  const parsed = parseJsonFromLLM<{ proposed_rank?: number; bio?: string }>(raw);
  if (!parsed?.bio || parsed.proposed_rank === undefined) return null;
  return {
    proposedRank: clampGunslingerRank(parsed.proposed_rank),
    bio: String(parsed.bio).trim(),
  };
}

export async function evaluateGunslingerRank(
  profile: PlayerProfile,
  lang: "en" | "es" = "en",
): Promise<GunslingerEvalResult> {
  const duelSummaries = await loadDuelSummaries(profile.recentDuelIds ?? []);
  const currentRank = profile.gunslinger?.rank ?? 0;
  const userPrompt = buildUserPrompt(profile, duelSummaries, lang);

  const useOG = process.env.USE_OG_COMPUTE === "true";

  if (useOG) {
    try {
      const { text } = await runOGTextInference(SYSTEM_PROMPT, userPrompt, { temperature: 0.4 });
      const parsed = parseEvalResponse(text);
      if (parsed) {
        const rank = rankMonotonicMerge(currentRank, parsed.proposedRank);
        return {
          rank,
          bio: parsed.bio,
          proposedRank: parsed.proposedRank,
          source: "tee",
        };
      }
    } catch {
      // fall through to heuristic
    }
  }

  const proposedRank = heuristicRank(profile, duelSummaries);
  const rank = rankMonotonicMerge(currentRank, proposedRank);
  return {
    rank: rank || (profile.stats.duelsPlayed >= 3 ? 1 : 0),
    bio: heuristicBio(profile, rank || 1, lang),
    proposedRank,
    source: "heuristic",
  };
}

import { join } from "node:path";
import { getTournamentPhaseInfo, type TournamentPhaseInfo } from "@zegon/game-core";
import { leaderboardDir } from "../utils/paths.js";
import { loadPersistedJson, savePersistedJson } from "./jsonBlobStore.js";
import type { PlayerProfile } from "./profileTypes.js";
import { listAllProfiles } from "./playerProfiles.js";
import { getSql, isDatabaseConfigured } from "./db.js";

export interface Season {
  id: string;
  name: string;
  startAt: number;
  endAt: number;
  prizePoolWei: string;
  status: "active" | "closed" | "claimable";
  snapshot?: SeasonSnapshotEntry[];
}

export interface SeasonSnapshotEntry {
  playerId: string;
  nickname: string;
  seasonPoints: number;
  rank: number;
  rewardWei?: string;
}

const SEASONS_FILE = join(leaderboardDir(), "seasons.json");
const SEASONS_BLOB = "zegon/seasons.json";
const DEFAULT_SEASON_DAYS = 14;

function defaultSeason(): Season {
  const now = Date.now();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const endAt = start.getTime() + DEFAULT_SEASON_DAYS * 24 * 60 * 60 * 1000;
  return {
    id: `season-${start.toISOString().slice(0, 10)}`,
    name: "Season 1",
    startAt: start.getTime(),
    endAt,
    prizePoolWei: process.env.SEASON_PRIZE_POOL_WEI ?? "0",
    status: "active",
  };
}

async function loadSeasonsFile(): Promise<Season[]> {
  const parsed = await loadPersistedJson<Season[]>(SEASONS_BLOB, SEASONS_FILE);
  return parsed && parsed.length > 0 ? parsed : [defaultSeason()];
}

async function saveSeasonsFile(seasons: Season[]): Promise<void> {
  await savePersistedJson(SEASONS_BLOB, SEASONS_FILE, seasons);
}

function normalizeMetric(value: number, min: number, max: number): number {
  if (max <= min) return value > 0 ? 100 : 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function computeSeasonPoints(profiles: PlayerProfile[]): Map<string, number> {
  if (profiles.length === 0) return new Map();

  const scores = profiles.map((p) => p.stats.bestGlobalScore);
  const wins = profiles.map((p) => p.stats.duelsWon);
  const rounds = profiles.map((p) => p.stats.totalRoundsPlayed);
  const verified = profiles.map((p) => p.stats.verifiedDuels);
  const ghostScores = profiles.map((p) => p.stats.totalRoundScore);

  const mins = {
    score: Math.min(...scores),
    wins: Math.min(...wins),
    rounds: Math.min(...rounds),
    verified: Math.min(...verified),
    ghost: Math.min(...ghostScores),
  };
  const maxs = {
    score: Math.max(...scores),
    wins: Math.max(...wins),
    rounds: Math.max(...rounds),
    verified: Math.max(...verified),
    ghost: Math.max(...ghostScores),
  };

  const out = new Map<string, number>();
  for (const p of profiles) {
    const sp =
      normalizeMetric(p.stats.bestGlobalScore, mins.score, maxs.score) * 0.35 +
      normalizeMetric(p.stats.duelsWon, mins.wins, maxs.wins) * 0.3 +
      normalizeMetric(p.stats.totalRoundsPlayed, mins.rounds, maxs.rounds) * 0.2 +
      normalizeMetric(p.stats.verifiedDuels, mins.verified, maxs.verified) * 0.1 +
      normalizeMetric(p.stats.totalRoundScore, mins.ghost, maxs.ghost) * 0.05;
    out.set(p.address, Math.round(sp * 10) / 10);
  }
  return out;
}

function distributeRewards(
  entries: SeasonSnapshotEntry[],
  prizePoolWei: bigint,
): SeasonSnapshotEntry[] {
  if (prizePoolWei <= 0n || entries.length === 0) return entries;

  const weights: Array<{ rank: number; pct: number }> = [
    { rank: 1, pct: 0.25 },
    { rank: 2, pct: 0.15 },
    { rank: 3, pct: 0.1 },
  ];
  const top10Share = 0.25;
  const top50Share = 0.25;

  const byRank = new Map(entries.map((e) => [e.rank, e]));
  const result = entries.map((e) => ({ ...e }));

  for (const w of weights) {
    const entry = byRank.get(w.rank);
    if (entry) {
      entry.rewardWei = ((prizePoolWei * BigInt(Math.round(w.pct * 10000))) / 10000n).toString();
    }
  }

  const rank4to10 = result.filter((e) => e.rank >= 4 && e.rank <= 10);
  if (rank4to10.length > 0) {
    const each =
      (prizePoolWei * BigInt(Math.round(top10Share * 10000))) /
      10000n /
      BigInt(rank4to10.length);
    for (const e of rank4to10) e.rewardWei = each.toString();
  }

  const rank11to50 = result.filter((e) => e.rank >= 11 && e.rank <= 50);
  if (rank11to50.length > 0) {
    const each =
      (prizePoolWei * BigInt(Math.round(top50Share * 10000))) /
      10000n /
      BigInt(rank11to50.length);
    for (const e of rank11to50) e.rewardWei = each.toString();
  }

  return result;
}

export async function getActiveSeason(): Promise<Season> {
  const seasons = await loadSeasonsFile();
  const active = seasons.find((s) => s.status === "active");
  if (active) {
    if (Date.now() > active.endAt && !active.snapshot) {
      return closeSeason(active.id);
    }
    return active;
  }
  const latest = seasons[seasons.length - 1] ?? defaultSeason();
  return latest;
}

export async function getSeasonInfo(): Promise<{
  season: Season;
  msRemaining: number;
  playerClaim?: SeasonSnapshotEntry;
}> {
  const season = await getActiveSeason();
  const msRemaining = Math.max(0, season.endAt - Date.now());
  return { season, msRemaining };
}

export function getTournamentInfo(): TournamentPhaseInfo {
  return getTournamentPhaseInfo();
}

export async function closeSeason(seasonId: string): Promise<Season> {
  const seasons = await loadSeasonsFile();
  const idx = seasons.findIndex((s) => s.id === seasonId);
  if (idx < 0) throw new Error("SEASON_NOT_FOUND");

  const season = seasons[idx]!;
  if (season.snapshot) return season;

  const profiles = await listAllProfiles();
  const points = computeSeasonPoints(profiles);
  const ranked = [...points.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([playerId, seasonPoints], i) => {
      const profile = profiles.find((p) => p.address === playerId);
      return {
        playerId,
        nickname: profile?.nickname ?? playerId.slice(0, 8),
        seasonPoints,
        rank: i + 1,
      };
    });

  const pool = BigInt(season.prizePoolWei || "0");
  season.snapshot = distributeRewards(ranked, pool);
  season.status = pool > 0n ? "claimable" : "closed";
  seasons[idx] = season;
  await saveSeasonsFile(seasons);

  if (isDatabaseConfigured()) {
    const sql = await getSql();
    if (sql) {
      await sql`
        INSERT INTO seasons (id, name, start_at, end_at, prize_pool_wei, status, snapshot)
        VALUES (
          ${season.id}, ${season.name}, ${season.startAt}, ${season.endAt},
          ${season.prizePoolWei}, ${season.status}, ${JSON.stringify(season.snapshot)}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, snapshot = EXCLUDED.snapshot
      `;
    }
  }

  return season;
}

export async function getPlayerSeasonClaim(
  address: string,
): Promise<SeasonSnapshotEntry | null> {
  const seasons = await loadSeasonsFile();
  for (const season of seasons) {
    if (season.status !== "claimable" || !season.snapshot) continue;
    const entry = season.snapshot.find(
      (e) => e.playerId.toLowerCase() === address.toLowerCase(),
    );
    if (entry?.rewardWei && entry.rewardWei !== "0") return entry;
  }
  return null;
}

export async function listSeasons(): Promise<Season[]> {
  return loadSeasonsFile();
}

import type { PlayerProfile } from "./profileTypes.js";
import { listAllProfiles } from "./playerProfiles.js";

export type StatsBoardType =
  | "score"
  | "hunter"
  | "veteran"
  | "ghost"
  | "speed"
  | "verified";

export interface StatsBoardEntry {
  playerId: string;
  nickname?: string;
  displayName?: string;
  value: number;
  secondary?: number;
  timestamp?: number;
}

const MIN_GHOST_ROUNDS = 1;

function metricValue(profile: PlayerProfile, board: StatsBoardType): number | null {
  const s = profile.stats;
  switch (board) {
    case "score":
      return s.bestGlobalScore > 0 ? s.bestGlobalScore : null;
    case "hunter":
      return s.duelsWon > 0 ? s.duelsWon : null;
    case "veteran":
      return s.totalRoundsPlayed > 0 ? s.totalRoundsPlayed : null;
    case "ghost":
      if (s.totalRoundsPlayed < MIN_GHOST_ROUNDS) return null;
      return s.totalRoundScore;
    case "speed":
      return s.fastestWinMs !== null && s.fastestWinMs > 0 ? s.fastestWinMs : null;
    case "verified":
      return s.verifiedDuels > 0 ? s.verifiedDuels : null;
    default:
      return null;
  }
}

function sortEntries(
  entries: StatsBoardEntry[],
  board: StatsBoardType,
): StatsBoardEntry[] {
  const asc = board === "speed";
  return [...entries].sort((a, b) => (asc ? a.value - b.value : b.value - a.value));
}

export async function getStatsBoard(
  board: StatsBoardType,
  limit = 50,
): Promise<StatsBoardEntry[]> {
  const profiles = await listAllProfiles();
  const entries: StatsBoardEntry[] = [];

  for (const profile of profiles) {
    const value = metricValue(profile, board);
    if (value === null) continue;
    entries.push({
      playerId: profile.address,
      nickname: profile.nickname,
      displayName: profile.nickname,
      value,
      secondary:
        board === "ghost" ? profile.stats.totalRoundsPlayed : profile.stats.duelsPlayed,
      timestamp: profile.updatedAt,
    });
  }

  return sortEntries(entries, board).slice(0, limit);
}

export async function getPlayerRank(
  address: string,
  board: StatsBoardType,
): Promise<{ rank: number | null; total: number; value: number | null }> {
  const boardEntries = await getStatsBoard(board, 500);
  const idx = boardEntries.findIndex(
    (e) => e.playerId.toLowerCase() === address.toLowerCase(),
  );
  if (idx < 0) {
    const profiles = await listAllProfiles();
    const profile = profiles.find((p) => p.address.toLowerCase() === address.toLowerCase());
    const value = profile ? metricValue(profile, board) : null;
    return { rank: null, total: boardEntries.length, value };
  }
  return {
    rank: idx + 1,
    total: boardEntries.length,
    value: boardEntries[idx]!.value,
  };
}

export function formatBoardValue(board: StatsBoardType, value: number): string {
  switch (board) {
    case "ghost":
      return String(Math.round(value));
    case "speed":
      return `${(value / 1000).toFixed(1)}s`;
    case "verified":
    case "hunter":
    case "veteran":
      return String(Math.round(value));
    default:
      return String(Math.round(value));
  }
}

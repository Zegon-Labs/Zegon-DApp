import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";
import { loadPersistedJson, savePersistedJson } from "./jsonBlobStore.js";

export interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: number;
}

const DATA_DIR = leaderboardDir();

async function loadBoard(seed: string): Promise<LeaderboardEntry[]> {
  const local = join(DATA_DIR, `${seed}.json`);
  const blob = `zegon/daily/${seed}.json`;
  const data = await loadPersistedJson<LeaderboardEntry[]>(blob, local);
  return data ?? [];
}

async function saveBoard(seed: string, entries: LeaderboardEntry[]): Promise<void> {
  const local = join(DATA_DIR, `${seed}.json`);
  const blob = `zegon/daily/${seed}.json`;
  await savePersistedJson(blob, local, entries);
}

export async function submitScore(
  playerId: string,
  score: number,
  seed: string,
): Promise<void> {
  const board = await loadBoard(seed);
  const existing = board.find((e) => e.playerId === playerId);

  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.timestamp = Date.now();
    }
  } else {
    board.push({ playerId, score, timestamp: Date.now() });
  }

  board.sort((a, b) => b.score - a.score);
  await saveBoard(seed, board.slice(0, 100));
}

export async function getLeaderboard(seed: string): Promise<LeaderboardEntry[]> {
  return loadBoard(seed);
}

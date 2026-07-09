import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";
import { loadPersistedJson, savePersistedJson } from "./jsonBlobStore.js";

export interface GlobalLeaderboardEntry {
  playerId: string;
  score: number;
  duelId?: string;
  nickname?: string;
  timestamp: number;
}

const DATA_FILE = join(leaderboardDir(), "global.json");
const GLOBAL_BLOB = "zegon/global-scores.json";

async function loadBoard(): Promise<GlobalLeaderboardEntry[]> {
  const data = await loadPersistedJson<GlobalLeaderboardEntry[]>(GLOBAL_BLOB, DATA_FILE);
  return data ?? [];
}

async function saveBoard(entries: GlobalLeaderboardEntry[]): Promise<void> {
  await savePersistedJson(GLOBAL_BLOB, DATA_FILE, entries);
}

export async function submitGlobalScore(
  playerId: string,
  score: number,
  duelId?: string,
  nickname?: string,
): Promise<void> {
  const board = await loadBoard();
  const existing = board.find((e) => e.playerId === playerId);

  if (existing) {
    if (nickname) existing.nickname = nickname;
    if (score > existing.score) {
      existing.score = score;
      existing.timestamp = Date.now();
      existing.duelId = duelId ?? existing.duelId;
    }
  } else {
    board.push({ playerId, score, duelId, nickname, timestamp: Date.now() });
  }

  board.sort((a, b) => b.score - a.score);
  await saveBoard(board.slice(0, 100));
}

export async function getGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  return loadBoard();
}

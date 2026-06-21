import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";

export interface GlobalLeaderboardEntry {
  playerId: string;
  score: number;
  duelId?: string;
  timestamp: number;
}

const DATA_FILE = join(leaderboardDir(), "global.json");

async function loadBoard(): Promise<GlobalLeaderboardEntry[]> {
  try {
    await mkdir(leaderboardDir(), { recursive: true });
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data) as GlobalLeaderboardEntry[];
  } catch {
    return [];
  }
}

async function saveBoard(entries: GlobalLeaderboardEntry[]): Promise<void> {
  await mkdir(leaderboardDir(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(entries, null, 2));
}

export async function submitGlobalScore(
  playerId: string,
  score: number,
  duelId?: string,
): Promise<void> {
  const board = await loadBoard();
  const existing = board.find((e) => e.playerId === playerId);

  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.timestamp = Date.now();
      existing.duelId = duelId ?? existing.duelId;
    }
  } else {
    board.push({ playerId, score, duelId, timestamp: Date.now() });
  }

  board.sort((a, b) => b.score - a.score);
  await saveBoard(board.slice(0, 100));
}

export async function getGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  return loadBoard();
}

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: number;
}

const DATA_DIR = process.env.LEADERBOARD_DIR ?? join(process.cwd(), ".leaderboard");

async function loadBoard(seed: string): Promise<LeaderboardEntry[]> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const data = await readFile(join(DATA_DIR, `${seed}.json`), "utf-8");
    return JSON.parse(data) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

async function saveBoard(seed: string, entries: LeaderboardEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    join(DATA_DIR, `${seed}.json`),
    JSON.stringify(entries, null, 2),
  );
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

import { join } from "node:path";
import { tmpdir } from "node:os";

/** Writable storage root — /tmp on Vercel serverless, cwd locally. */
export function dataRoot(): string {
  if (process.env.VERCEL) {
    return join(tmpdir(), "zegon");
  }
  return process.cwd();
}

export function sessionDir(): string {
  return process.env.DUEL_SESSION_DIR ?? join(dataRoot(), ".duel-sessions");
}

export function duelLogDir(): string {
  return process.env.DUEL_LOG_DIR ?? join(dataRoot(), ".duel-logs");
}

export function leaderboardDir(): string {
  return process.env.LEADERBOARD_DIR ?? join(dataRoot(), ".leaderboard");
}

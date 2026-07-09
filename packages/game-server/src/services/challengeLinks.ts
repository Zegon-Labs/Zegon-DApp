import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { isTournamentActive } from "@zegon/game-core";
import { leaderboardDir } from "../utils/paths.js";

export type ChallengeStatus = "open" | "accepted" | "resolved" | "expired";

export interface StoredChallenge {
  id: string;
  payload: Record<string, unknown>;
  createdAt: number;
  status: ChallengeStatus;
  expiresAt: number;
  defenderAddress?: string;
  defenderDuelId?: string;
  defenderWon?: boolean;
  matchId?: string;
  winner?: "challenger" | "defender" | "draw";
}

const DATA_FILE = join(leaderboardDir(), "challenges.json");
const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ChallengeStore = Record<string, StoredChallenge>;

function generateId(length = 6): string {
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ID_CHARS[bytes[i]! % ID_CHARS.length];
  }
  return id;
}

export function challengeMatchId(challengeId: string): string {
  return createHash("sha256").update(challengeId).digest("hex");
}

async function loadStore(): Promise<ChallengeStore> {
  try {
    await mkdir(leaderboardDir(), { recursive: true });
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ChallengeStore;
  } catch {
    return {};
  }
}

async function saveStore(store: ChallengeStore): Promise<void> {
  await mkdir(leaderboardDir(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

function normalizeChallenge(entry: StoredChallenge, now = Date.now()): StoredChallenge {
  if (entry.status === "resolved") return entry;
  if (now > entry.expiresAt || !isTournamentActive(now)) {
    return { ...entry, status: "expired" };
  }
  return entry;
}

function pruneExpired(store: ChallengeStore): ChallengeStore {
  const cutoff = Date.now() - MAX_AGE_MS;
  const next: ChallengeStore = {};
  for (const [id, entry] of Object.entries(store)) {
    if (entry.createdAt >= cutoff) next[id] = normalizeChallenge(entry);
  }
  return next;
}

export async function createChallengeLink(
  payload: Record<string, unknown>,
): Promise<{ id: string; matchId?: string }> {
  let store = pruneExpired(await loadStore());
  let id = generateId();
  while (store[id]) {
    id = generateId();
  }
  const now = Date.now();
  const staked = payload.staked === true;
  store[id] = {
    id,
    payload,
    createdAt: now,
    status: "open",
    expiresAt: now + CHALLENGE_TTL_MS,
    matchId: staked ? challengeMatchId(id) : undefined,
  };
  await saveStore(store);
  return { id, matchId: store[id]?.matchId };
}

export async function getChallengeLink(
  id: string,
): Promise<StoredChallenge | null> {
  if (!/^[a-z0-9]{6,8}$/i.test(id)) return null;
  const store = await loadStore();
  const entry = store[id.toLowerCase()];
  if (!entry) return null;
  if (Date.now() - entry.createdAt > MAX_AGE_MS) return null;
  return normalizeChallenge(entry);
}

export async function updateChallengeLink(
  id: string,
  patch: Partial<StoredChallenge>,
): Promise<StoredChallenge | null> {
  const store = await loadStore();
  const key = id.toLowerCase();
  const entry = store[key];
  if (!entry) return null;
  store[key] = { ...entry, ...patch, id: entry.id, payload: entry.payload };
  await saveStore(store);
  return store[key] ?? null;
}

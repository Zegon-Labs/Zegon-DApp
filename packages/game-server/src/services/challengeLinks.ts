import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";

export interface StoredChallenge {
  id: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

const DATA_FILE = join(leaderboardDir(), "challenges.json");
const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type ChallengeStore = Record<string, StoredChallenge>;

function generateId(length = 6): string {
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ID_CHARS[bytes[i]! % ID_CHARS.length];
  }
  return id;
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

function pruneExpired(store: ChallengeStore): ChallengeStore {
  const cutoff = Date.now() - MAX_AGE_MS;
  const next: ChallengeStore = {};
  for (const [id, entry] of Object.entries(store)) {
    if (entry.createdAt >= cutoff) next[id] = entry;
  }
  return next;
}

export async function createChallengeLink(
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  let store = pruneExpired(await loadStore());
  let id = generateId();
  while (store[id]) {
    id = generateId();
  }
  store[id] = { id, payload, createdAt: Date.now() };
  await saveStore(store);
  return { id };
}

export async function getChallengeLink(
  id: string,
): Promise<StoredChallenge | null> {
  if (!/^[a-z0-9]{6,8}$/i.test(id)) return null;
  const store = await loadStore();
  const entry = store[id.toLowerCase()];
  if (!entry) return null;
  if (Date.now() - entry.createdAt > MAX_AGE_MS) return null;
  return entry;
}

import { join } from "node:path";
import { leaderboardDir } from "../utils/paths.js";
import { loadPersistedJson, savePersistedJson } from "./jsonBlobStore.js";
import { storageDownloadUrl } from "./storage.js";

export interface DuelAuditEntry {
  duelId: string;
  playerId?: string;
  storageRoot?: string;
  storageUrl?: string;
  finishedAt: number;
  won?: boolean;
  score?: number;
}

interface DuelAuditStore {
  byDuelId: Record<string, DuelAuditEntry>;
  latestByPlayer: Record<string, string>;
}

const INDEX_FILE = join(leaderboardDir(), "duel-audit-index.json");
const INDEX_BLOB = "zegon/duel-audit-index.json";

async function loadStore(): Promise<DuelAuditStore> {
  const parsed = await loadPersistedJson<DuelAuditStore>(INDEX_BLOB, INDEX_FILE);
  return parsed ?? { byDuelId: {}, latestByPlayer: {} };
}

async function saveStore(store: DuelAuditStore): Promise<void> {
  await savePersistedJson(INDEX_BLOB, INDEX_FILE, store);
}

export async function indexDuelAudit(entry: DuelAuditEntry): Promise<void> {
  const store = await loadStore();
  store.byDuelId[entry.duelId] = entry;
  if (entry.playerId && entry.storageRoot) {
    store.latestByPlayer[entry.playerId.toLowerCase()] = entry.duelId;
  }
  await saveStore(store);
}

export async function getDuelAuditEntry(duelId: string): Promise<DuelAuditEntry | null> {
  const store = await loadStore();
  return store.byDuelId[duelId] ?? null;
}

export async function getLastDuelAuditForPlayer(
  playerId: string,
): Promise<DuelAuditEntry | null> {
  const store = await loadStore();
  const duelId = store.latestByPlayer[playerId.toLowerCase()];
  if (!duelId) return null;
  const entry = store.byDuelId[duelId];
  if (!entry?.storageRoot) return null;
  return {
    ...entry,
    storageUrl: entry.storageUrl ?? storageDownloadUrl(entry.storageRoot),
  };
}

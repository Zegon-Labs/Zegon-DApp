import {
  buildChallengerStyleProfile,
  summarizeChallengerStyle,
  type ChallengerStyleProfile,
  type ChallengerStyleSummary,
} from "@zegon/game-core";
import { getDuelAuditEntry } from "./duelAuditIndex.js";
import {
  fetchStorageJson,
  loadDuelLogPayload,
} from "./storage.js";

async function loadLogs(
  duelId: string,
  storageRoot?: string,
): Promise<unknown[] | null> {
  const local = await loadDuelLogPayload(duelId);
  if (local?.logs?.length) return local.logs;

  const indexed = await getDuelAuditEntry(duelId);
  const root = storageRoot ?? indexed?.storageRoot;
  if (!root) return null;

  const payload = await fetchStorageJson(root);
  if (!payload || typeof payload !== "object") return null;
  const logs = (payload as { logs?: unknown[] }).logs;
  return Array.isArray(logs) ? logs : null;
}

export async function loadChallengerStyleProfile(
  duelId: string,
  storageRoot?: string,
): Promise<ChallengerStyleProfile | null> {
  const logs = await loadLogs(duelId, storageRoot);
  if (!logs?.length) return null;
  return buildChallengerStyleProfile(logs);
}

export async function loadChallengerStyleSummary(
  duelId: string,
  storageRoot?: string,
  won?: boolean,
): Promise<ChallengerStyleSummary | null> {
  const logs = await loadLogs(duelId, storageRoot);
  if (!logs?.length) return null;
  return summarizeChallengerStyle(logs, won);
}

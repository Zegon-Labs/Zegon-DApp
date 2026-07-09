import { parseDuelAuditPayload, type ParsedDuelAudit } from "@zegon/game-core";

export interface DuelAuditEntryDto {
  duelId: string;
  playerId?: string;
  storageRoot?: string;
  storageUrl?: string;
  finishedAt?: number;
  won?: boolean;
  score?: number;
}

export async function fetchAuditPayloadByRoot(root: string): Promise<unknown | null> {
  const indexerUrl = `https://indexer-storage-turbo.0g.ai/download?root=${encodeURIComponent(root)}`;
  try {
    const res = await fetch(indexerUrl, { headers: { accept: "application/json" } });
    if (res.ok) return (await res.json()) as unknown;
  } catch {
    /* fallback */
  }
  try {
    const res = await fetch(`/api/audit/storage?root=${encodeURIComponent(root)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { payload?: unknown };
    return data.payload ?? null;
  } catch {
    return null;
  }
}

export async function loadDuelAudit(
  root: string,
  duelIdHint?: string,
): Promise<ParsedDuelAudit | null> {
  const payload = await fetchAuditPayloadByRoot(root);
  if (!payload) return null;
  const parsed = parseDuelAuditPayload(payload);
  if (!parsed) return null;
  if (duelIdHint && parsed.duelId === "unknown") {
    return { ...parsed, duelId: duelIdHint };
  }
  return parsed;
}

export async function fetchLastDuelAuditForPlayer(
  address: string,
): Promise<{ entry: DuelAuditEntryDto | null; audit: ParsedDuelAudit | null }> {
  try {
    const res = await fetch(
      `/api/player/${encodeURIComponent(address)}/last-duel-audit`,
    );
    if (!res.ok) return { entry: null, audit: null };
    const data = (await res.json()) as { entry?: DuelAuditEntryDto | null };
    const entry = data.entry ?? null;
    if (!entry?.storageRoot) return { entry, audit: null };
    const audit = await loadDuelAudit(entry.storageRoot, entry.duelId);
    return { entry, audit };
  } catch {
    return { entry: null, audit: null };
  }
}

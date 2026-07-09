import { createStandardDuel } from "./dailySeed.js";
import { DuelConfig } from "../types/index.js";
import type { ZegonArchetypeId } from "./zegonArchetypes.js";

export interface ChallengeMeta {
  challengerScore?: number;
  challengerName?: string;
  challengerDuelId?: string;
  challengerTimesRead?: number;
  challengerRounds?: number;
  challengerWon?: boolean;
  /** Full duel seed from challenger (for cloned ZEGON). */
  challengerSeed?: string;
  challengeKind?: "style" | "score";
  storageRoot?: string;
  challengeId?: string;
  staked?: boolean;
  matchId?: string;
  challengerAddress?: string;
}

export type ChallengePayload = Partial<DuelConfig> & ChallengeMeta;

const ARCHETYPE_CODES: Record<string, number> = {
  reader: 0,
  phantom: 1,
  deadeye: 2,
  gambler: 3,
};

const ARCHETYPE_BY_CODE: ZegonArchetypeId[] = [
  "reader",
  "phantom",
  "deadeye",
  "gambler",
];

const SHORT_ID_RE = /^[a-z0-9]{6,8}$/i;

function encodeBase64Json(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof btoa !== "undefined") {
    return btoa(json);
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

function decodeBase64Json(encoded: string): unknown {
  let json: string;
  if (typeof atob !== "undefined") {
    json = atob(encoded);
  } else {
    json = Buffer.from(encoded, "base64").toString("utf-8");
  }
  return JSON.parse(json) as unknown;
}

export function extractChallengeMeta(payload: ChallengePayload): ChallengeMeta {
  return {
    challengerScore: payload.challengerScore,
    challengerName: payload.challengerName,
    challengerDuelId: payload.challengerDuelId,
    challengerTimesRead: payload.challengerTimesRead,
    challengerRounds: payload.challengerRounds,
    challengerWon: payload.challengerWon,
    challengerSeed: payload.seed,
    challengeKind: payload.challengeKind,
    storageRoot: payload.storageRoot,
    challengeId: payload.challengeId,
    staked: payload.staked,
    matchId: payload.matchId,
    challengerAddress: payload.challengerAddress,
  };
}

export function payloadFromChallengeDuel(
  config: DuelConfig,
  meta: ChallengeMeta,
): ChallengePayload {
  return {
    ...config,
    seed: config.seed ?? meta.challengerSeed,
    challengerScore: meta.challengerScore,
    challengerName: meta.challengerName,
    challengerDuelId: meta.challengerDuelId,
    challengerTimesRead: meta.challengerTimesRead,
    challengerRounds: meta.challengerRounds,
    challengerWon: meta.challengerWon,
  };
}

export function payloadFromParts(
  payload: ChallengePayload,
): { config: DuelConfig; meta: ChallengeMeta } {
  const meta = extractChallengeMeta(payload);
  const {
    challengerScore: _s,
    challengerName: _n,
    challengerDuelId: _d,
    challengerTimesRead: _tr,
    challengerRounds: _rp,
    challengerWon: _w,
    challengeKind: _ck,
    storageRoot: _sr,
    challengeId: _ci,
    staked: _st,
    matchId: _mi,
    challengerAddress: _ca,
    ...configFields
  } = payload;
  return {
    config: {
      ...createStandardDuel(),
      ...configFields,
      mode: "challenge",
    },
    meta,
  };
}

export function encodeChallengePayload(payload: ChallengePayload): string {
  return encodeBase64Json(payload);
}

export function decodeChallengePayload(encoded: string): {
  config: DuelConfig;
  meta: ChallengeMeta;
} {
  const parsed = decodeBase64Json(encoded) as ChallengePayload;
  return payloadFromParts(parsed);
}

export function encodeChallenge(config: DuelConfig): string {
  return encodeChallengePayload(config);
}

export function decodeChallenge(encoded: string): DuelConfig {
  return decodeChallengePayload(encoded).config;
}

/** Compact inline token (~25–40 chars) for fallback when short-link API is unavailable. */
export function encodeChallengeCompact(payload: ChallengePayload): string {
  const score = Math.max(0, Math.floor(payload.challengerScore ?? 0));
  const arch = ARCHETYPE_CODES[payload.archetype ?? "reader"] ?? 0;
  const mode =
    payload.mode === "daily" ? "d" : payload.mode === "challenge" ? "c" : "s";
  const name = (payload.challengerName ?? "")
    .slice(0, 12)
    .replace(/[.|]/g, "")
    .trim();
  return `v1.${score.toString(36)}.${arch}.${mode}.${name}`;
}

export function decodeChallengeCompact(token: string): {
  config: DuelConfig;
  meta: ChallengeMeta;
} {
  const parts = token.split(".");
  if (parts[0] !== "v1" || parts.length < 5) {
    throw new Error("Invalid compact challenge token");
  }
  const score = parseInt(parts[1]!, 36);
  const archIdx = Number(parts[2]);
  const modeChar = parts[3];
  const name = parts.slice(4).join(".");
  const archetype = ARCHETYPE_BY_CODE[archIdx] ?? "reader";
  const mode =
    modeChar === "d" ? "daily" : modeChar === "c" ? "challenge" : "standard";

  return payloadFromParts({
    archetype,
    mode,
    challengerScore: Number.isFinite(score) ? score : 0,
    challengerName: name || undefined,
  });
}

export function isShortChallengeId(value: string): boolean {
  return SHORT_ID_RE.test(value) && !value.startsWith("v1");
}

export function buildChallengeUrl(baseUrl: string, payload: ChallengePayload): string {
  const compact = encodeChallengeCompact(payload);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}c=${encodeURIComponent(compact)}`;
}

export function buildShortChallengeUrl(baseUrl: string, id: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}c=${id}`;
}

export function parseChallengeFromSearch(search: string): {
  config: DuelConfig;
  meta: ChallengeMeta;
} | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);

  const compact = params.get("c");
  if (compact) {
    if (compact.startsWith("v1.")) {
      try {
        return decodeChallengeCompact(compact);
      } catch {
        return null;
      }
    }
    if (isShortChallengeId(compact)) {
      return null;
    }
  }

  const raw = params.get("challenge");
  if (!raw) return null;
  try {
    return decodeChallengePayload(raw);
  } catch {
    return null;
  }
}

/** Resolve challenge from URL, fetching short server ids when needed. */
export async function resolveChallengeFromSearch(
  search: string,
  fetchShortId?: (id: string) => Promise<ChallengePayload | null>,
): Promise<{ config: DuelConfig; meta: ChallengeMeta } | null> {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const c = params.get("c");

  if (c && isShortChallengeId(c) && fetchShortId) {
    const payload = await fetchShortId(c);
    if (payload) return payloadFromParts(payload);
  }

  return parseChallengeFromSearch(search);
}

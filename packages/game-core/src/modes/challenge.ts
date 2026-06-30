import { createStandardDuel } from "./dailySeed.js";
import { DuelConfig } from "../types/index.js";

export interface ChallengeMeta {
  challengerScore?: number;
  challengerName?: string;
  challengerDuelId?: string;
}

export type ChallengePayload = Partial<DuelConfig> & ChallengeMeta;

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
  const meta = extractChallengeMeta(parsed);
  const { challengerScore: _s, challengerName: _n, challengerDuelId: _d, ...configFields } =
    parsed;
  return {
    config: {
      ...createStandardDuel(),
      ...configFields,
      mode: "challenge",
    },
    meta,
  };
}

export function encodeChallenge(config: DuelConfig): string {
  return encodeChallengePayload(config);
}

export function decodeChallenge(encoded: string): DuelConfig {
  return decodeChallengePayload(encoded).config;
}

export function buildChallengeUrl(baseUrl: string, payload: ChallengePayload): string {
  const encoded = encodeChallengePayload(payload);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}challenge=${encodeURIComponent(encoded)}`;
}

export function parseChallengeFromSearch(search: string): {
  config: DuelConfig;
  meta: ChallengeMeta;
} | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get("challenge");
  if (!raw) return null;
  try {
    return decodeChallengePayload(raw);
  } catch {
    return null;
  }
}

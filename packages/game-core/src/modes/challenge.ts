import { createStandardDuel } from "./dailySeed.js";
import { DuelConfig } from "../types/index.js";

export function encodeChallenge(config: DuelConfig): string {
  const json = JSON.stringify(config);
  if (typeof btoa !== "undefined") {
    return btoa(json);
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

export function decodeChallenge(encoded: string): DuelConfig {
  let json: string;
  if (typeof atob !== "undefined") {
    json = atob(encoded);
  } else {
    json = Buffer.from(encoded, "base64").toString("utf-8");
  }
  const parsed = JSON.parse(json) as DuelConfig;
  return {
    ...createStandardDuel(),
    ...parsed,
    mode: "challenge",
  };
}

export function buildChallengeUrl(
  baseUrl: string,
  config: DuelConfig,
): string {
  const encoded = encodeChallenge(config);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}challenge=${encodeURIComponent(encoded)}`;
}

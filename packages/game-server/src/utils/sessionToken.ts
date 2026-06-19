import type { DuelSession } from "../types/duelSession.js";

export function encodeSessionToken(session: DuelSession): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

export function decodeSessionToken(token: string): DuelSession | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    return JSON.parse(json) as DuelSession;
  } catch {
    return null;
  }
}

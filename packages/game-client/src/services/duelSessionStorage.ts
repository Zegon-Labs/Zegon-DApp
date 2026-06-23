const TOKEN_PREFIX = "zegon-duel-token:";

export function saveDuelSessionToken(duelId: string, sessionToken: string): void {
  try {
    sessionStorage.setItem(`${TOKEN_PREFIX}${duelId}`, sessionToken);
    sessionStorage.setItem("zegon-last-duel-id", duelId);
    sessionStorage.setItem("zegon-last-duel-token", sessionToken);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getDuelSessionToken(duelId: string): string | null {
  try {
    return sessionStorage.getItem(`${TOKEN_PREFIX}${duelId}`);
  } catch {
    return null;
  }
}

export function verifyApiUrl(duelId: string, apiBaseUrl = ""): string {
  const token = getDuelSessionToken(duelId);
  const base = `${apiBaseUrl}/api/duel/verify/${encodeURIComponent(duelId)}`;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}

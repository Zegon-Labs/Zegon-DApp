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

const ROUNDS_PREFIX = "zegon-duel-rounds:";

export interface StoredDuelRound {
  roundIndex: number;
  playerAction: string;
  itemUsed?: string;
  predictionCorrect?: boolean;
  predictedMove?: string;
  zegonMove?: string;
}

export function saveDuelRoundLogs(duelId: string, rounds: StoredDuelRound[]): void {
  try {
    sessionStorage.setItem(`${ROUNDS_PREFIX}${duelId}`, JSON.stringify(rounds));
  } catch {
    /* ignore */
  }
}

export function getDuelRoundLogs(duelId: string): StoredDuelRound[] | null {
  try {
    const raw = sessionStorage.getItem(`${ROUNDS_PREFIX}${duelId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDuelRound[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

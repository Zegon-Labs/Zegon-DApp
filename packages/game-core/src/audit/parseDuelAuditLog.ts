export interface DuelAuditRoundRow {
  round: number;
  zegonCommit?: string;
  zegonReveal?: string;
  predictedMove?: string;
  playerAction?: string;
  itemUsed?: string;
  predictionCorrect?: boolean;
  taunt?: string;
}

export interface ParsedDuelAudit {
  duelId: string;
  storedAt?: number;
  rounds: DuelAuditRoundRow[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readDecision(log: Record<string, unknown>): Record<string, unknown> | null {
  const decision = log.decision;
  return asRecord(decision);
}

export function parseDuelAuditPayload(payload: unknown): ParsedDuelAudit | null {
  const root = asRecord(payload);
  if (!root) return null;

  const duelId = typeof root.duelId === "string" ? root.duelId : "unknown";
  const storedAt = typeof root.storedAt === "number" ? root.storedAt : undefined;
  const rawLogs = Array.isArray(root.logs) ? root.logs : [];

  const rounds: DuelAuditRoundRow[] = rawLogs.map((item, index) => {
    const log = asRecord(item) ?? {};
    const decision = readDecision(log);
    return {
      round: typeof log.roundIndex === "number" ? log.roundIndex + 1 : index + 1,
      zegonCommit: typeof log.commitHash === "string" ? log.commitHash : undefined,
      zegonReveal:
        typeof decision?.zegonMove === "string"
          ? decision.zegonMove
          : typeof log.zegonMove === "string"
            ? log.zegonMove
            : undefined,
      predictedMove:
        typeof decision?.predictedPlayerMove === "string"
          ? decision.predictedPlayerMove
          : typeof log.predictedMove === "string"
            ? log.predictedMove
            : undefined,
      playerAction: typeof log.playerAction === "string" ? log.playerAction : undefined,
      itemUsed: typeof log.itemUsed === "string" ? log.itemUsed : undefined,
      predictionCorrect:
        typeof log.predictionCorrect === "boolean" ? log.predictionCorrect : undefined,
      taunt: typeof decision?.taunt === "string" ? decision.taunt : undefined,
    };
  });

  return { duelId, storedAt, rounds };
}

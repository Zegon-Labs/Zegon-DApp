import { PlayerAction, type ChallengerStyleProfile } from "../types/index.js";

export type StyleChallengeOutcome = "defender" | "challenger" | "draw";

/** Win-only PvP resolution: defender wins if they won and challenger lost. */
export function resolveStyleChallenge(
  challengerWon: boolean,
  defenderWon: boolean,
): StyleChallengeOutcome {
  if (defenderWon && !challengerWon) return "defender";
  if (!defenderWon && challengerWon) return "challenger";
  return "draw";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function buildChallengerStyleProfile(logs: readonly unknown[]): ChallengerStyleProfile {
  const rounds: ChallengerStyleProfile["rounds"] = [];
  const actionCounts = new Map<PlayerAction, number>();
  const transitions = new Map<string, number>();
  let prevAction: PlayerAction | null = null;

  for (const item of logs) {
    const log = asRecord(item);
    if (!log) continue;
    const roundIndex =
      typeof log.roundIndex === "number" ? log.roundIndex : rounds.length;
    const playerAction =
      typeof log.playerAction === "string"
        ? (log.playerAction as PlayerAction)
        : undefined;
    const itemUsed =
      typeof log.itemUsed === "string" ? (log.itemUsed as string) : undefined;

    if (playerAction) {
      actionCounts.set(playerAction, (actionCounts.get(playerAction) ?? 0) + 1);
      if (prevAction) {
        const key = `${prevAction}->${playerAction}`;
        transitions.set(key, (transitions.get(key) ?? 0) + 1);
      }
      prevAction = playerAction;
      rounds.push({ roundIndex, playerAction, itemUsed });
    }
  }

  const totalActions = [...actionCounts.values()].reduce((a, b) => a + b, 0) || 1;
  const actionFreq: Partial<Record<PlayerAction, number>> = {};
  for (const [action, count] of actionCounts) {
    actionFreq[action] = count / totalActions;
  }

  const transitionFreq: Partial<Record<string, number>> = {};
  const transitionTotal = [...transitions.values()].reduce((a, b) => a + b, 0) || 1;
  for (const [key, count] of transitions) {
    transitionFreq[key] = count / transitionTotal;
  }

  return { actionFreq, transitions: transitionFreq, rounds };
}

export interface ChallengerStyleSummary {
  rounds: number;
  reads: number;
  won?: boolean;
}

export function summarizeChallengerStyle(
  logs: readonly unknown[],
  won?: boolean,
): ChallengerStyleSummary {
  let reads = 0;
  for (const item of logs) {
    const log = asRecord(item);
    if (log?.predictionCorrect === true) reads += 1;
  }
  return { rounds: logs.length, reads, won };
}

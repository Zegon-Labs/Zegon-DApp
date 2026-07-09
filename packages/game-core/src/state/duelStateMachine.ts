import {
  DuelPhase,
  DuelState,
  DuelWinner,
  RoundContext,
} from "../types/index.js";
import { getItemCooldownRounds } from "../progression/upgrades.js";

const VALID_TRANSITIONS: Record<DuelPhase, DuelPhase[]> = {
  [DuelPhase.IDLE]: [DuelPhase.ZEGON_THINKING],
  [DuelPhase.ZEGON_THINKING]: [DuelPhase.AWAITING_PLAYER],
  [DuelPhase.AWAITING_PLAYER]: [DuelPhase.RESOLVING],
  [DuelPhase.RESOLVING]: [DuelPhase.ROUND_END],
  [DuelPhase.ROUND_END]: [
    DuelPhase.DEADEYE,
    DuelPhase.ZEGON_THINKING,
    DuelPhase.DUEL_END,
  ],
  [DuelPhase.DEADEYE]: [DuelPhase.ZEGON_THINKING],
  [DuelPhase.DUEL_END]: [],
};

export class InvalidPhaseTransitionError extends Error {
  constructor(from: DuelPhase, to: DuelPhase) {
    super(`Invalid phase transition: ${from} → ${to}`);
    this.name = "InvalidPhaseTransitionError";
  }
}

export function canTransition(from: DuelPhase, to: DuelPhase): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transitionPhase(
  state: DuelState,
  to: DuelPhase,
): DuelState {
  if (!canTransition(state.phase, to)) {
    throw new InvalidPhaseTransitionError(state.phase, to);
  }
  return { ...state, phase: to };
}

export function buildRoundContext(state: DuelState): RoundContext {
  const timesReadSoFar = state.roundLogs.filter((l) => l.predictionCorrect).length;
  const itemHistory = state.roundLogs
    .map((l) => l.itemUsed)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
  const itemUsageCounts: Partial<Record<string, number>> = {};
  for (const id of itemHistory) {
    itemUsageCounts[id] = (itemUsageCounts[id] ?? 0) + 1;
  }

  return {
    roundIndex: state.roundIndex,
    playerHistory: state.playerHistory,
    playerHp: state.playerHp,
    zegonHp: state.zegonHp,
    weapon: state.weapon,
    ammo: state.ammo,
    blindsight: state.blindsight,
    readingStreak: state.readingStreak,
    equippedItem: state.equippedItem,
    itemCooldown: state.itemCooldown,
    itemCooldownRounds: getItemCooldownRounds(state.config),
    isDeadeye: state.isDeadeye,
    modifiers: state.config.modifiers,
    archetype: state.config.archetype,
    timesReadSoFar,
    itemHistory,
    itemUsageCounts,
    challengerStyle: state.config.challengerStyleProfile,
  };
}

export function isDuelOver(state: DuelState): boolean {
  return (
    state.phase === DuelPhase.DUEL_END ||
    state.playerHp <= 0 ||
    state.zegonHp <= 0 ||
    state.roundIndex >= state.config.maxRounds
  );
}

export function determineDuelWinner(state: DuelState): DuelWinner {
  if (state.playerHp <= 0 && state.zegonHp <= 0) {
    return DuelWinner.DRAW;
  }
  if (state.playerHp <= 0) {
    return DuelWinner.ZEGON;
  }
  if (state.zegonHp <= 0) {
    return DuelWinner.PLAYER;
  }
  if (state.roundsWonByPlayer > state.roundsWonByZegon) {
    return DuelWinner.PLAYER;
  }
  if (state.roundsWonByZegon > state.roundsWonByPlayer) {
    return DuelWinner.ZEGON;
  }
  return DuelWinner.DRAW;
}

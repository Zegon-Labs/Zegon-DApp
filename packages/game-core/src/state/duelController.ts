import { COMBAT, DEFAULT_DUEL_CONFIG, SCORE } from "../constants/index.js";
import { IZegonBrain } from "../ai/IZegonBrain.js";
import {
  applyRoundOutcomeToHp,
  determineRoundWinner,
  resolveRound,
} from "../combat/resolveRound.js";
import { getStartingAmmo } from "../weapons/registry.js";
import {
  buildRoundContext,
  determineDuelWinner,
  isDuelOver,
  transitionPhase,
} from "./duelStateMachine.js";
import {
  assertCanPerformAction,
  getAvailableActions,
} from "../validation/actionValidator.js";
import {
  DuelConfig,
  DuelEvent,
  DuelEventListener,
  DuelPhase,
  DuelResult,
  DuelState,
  DuelWinner,
  PlayerAction,
  RoundOutcome,
  ZegonDecision,
} from "../types/index.js";

export class DuelController {
  private state: DuelState;
  private listeners: DuelEventListener[] = [];

  constructor(
    private readonly brain: IZegonBrain,
    config: Partial<DuelConfig> = {},
  ) {
    const mergedConfig: DuelConfig = {
      ...DEFAULT_DUEL_CONFIG,
      ...config,
    };

    this.state = {
      phase: DuelPhase.IDLE,
      roundIndex: 0,
      playerHp: mergedConfig.initialPlayerHp,
      zegonHp: mergedConfig.initialZegonHp,
      weapon: mergedConfig.weapon,
      ammo: getStartingAmmo(mergedConfig.weapon),
      blindsight: 0,
      isDeadeye: false,
      playerHistory: [],
      roundsWonByPlayer: 0,
      roundsWonByZegon: 0,
      pendingZegonDecision: null,
      roundLogs: [],
      config: mergedConfig,
    };
  }

  on(listener: DuelEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: Omit<DuelEvent, "state">): void {
    const fullEvent: DuelEvent = { ...event, state: this.getState() };
    for (const listener of this.listeners) {
      listener(fullEvent);
    }
  }

  getState(): DuelState {
    return structuredClone(this.state);
  }

  getAvailableActions(): PlayerAction[] {
    return getAvailableActions(this.state);
  }

  isDuelOver(): boolean {
    return isDuelOver(this.state);
  }

  async startDuel(): Promise<void> {
    this.state = transitionPhase(this.state, DuelPhase.ZEGON_THINKING);
    this.emit({ type: "phaseChange" });
    await this.beginRound();
  }

  private async beginRound(): Promise<void> {
    const ctx = buildRoundContext(this.state);
    const decision = await this.brain.decide(ctx);
    this.submitZegonDecision(decision);
  }

  submitZegonDecision(decision: ZegonDecision): void {
    if (this.state.phase !== DuelPhase.ZEGON_THINKING) {
      throw new Error("ZEGON decision only accepted during ZEGON_THINKING");
    }

    this.state = {
      ...this.state,
      pendingZegonDecision: decision,
    };

    this.state = transitionPhase(this.state, DuelPhase.AWAITING_PLAYER);
    this.emit({ type: "phaseChange" });
  }

  setPendingDecision(decision: ZegonDecision): void {
    if (this.state.phase !== DuelPhase.AWAITING_PLAYER) {
      throw new Error("Pending decision only updatable during AWAITING_PLAYER");
    }
    this.state = {
      ...this.state,
      pendingZegonDecision: decision,
    };
  }

  submitPlayerAction(action: PlayerAction): RoundOutcome {
    assertCanPerformAction(this.state, action);

    if (!this.state.pendingZegonDecision) {
      throw new Error("No pending ZEGON decision");
    }

    const decision = this.state.pendingZegonDecision;

    this.state = transitionPhase(this.state, DuelPhase.RESOLVING);
    this.emit({ type: "phaseChange" });

    const ctx = buildRoundContext(this.state);
    const outcome = resolveRound(ctx, action, decision, {
      playerActionTimestamp: Date.now(),
    });

    const hp = applyRoundOutcomeToHp(
      this.state.playerHp,
      this.state.zegonHp,
      outcome,
    );

    const roundWinner = determineRoundWinner(outcome);
    let roundsWonByPlayer = this.state.roundsWonByPlayer;
    let roundsWonByZegon = this.state.roundsWonByZegon;

    if (roundWinner === "player") {
      roundsWonByPlayer += 1;
    } else if (roundWinner === "zegon") {
      roundsWonByZegon += 1;
    }

    this.state = {
      ...this.state,
      playerHp: hp.playerHp,
      zegonHp: hp.zegonHp,
      ammo: outcome.ammoAfter,
      blindsight: outcome.blindsightAfter,
      playerHistory: [...this.state.playerHistory, action],
      roundsWonByPlayer,
      roundsWonByZegon,
      pendingZegonDecision: null,
      roundLogs: [...this.state.roundLogs, outcome.log],
    };

    if (outcome.deadeyeConsumed) {
      this.state.isDeadeye = false;
    } else if (outcome.deadeyeTriggered) {
      this.state.isDeadeye = true;
    }

    this.state = transitionPhase(this.state, DuelPhase.ROUND_END);
    this.emit({ type: "roundResolved", outcome });

    if (outcome.deadeyeTriggered) {
      this.emit({ type: "deadeye" });
    }

    this.advanceAfterRound();
    return outcome;
  }

  private advanceAfterRound(): void {
    if (
      this.state.playerHp <= 0 ||
      this.state.zegonHp <= 0 ||
      this.state.roundIndex + 1 >= this.state.config.maxRounds
    ) {
      this.state = transitionPhase(this.state, DuelPhase.DUEL_END);
      this.emit({ type: "phaseChange" });
      this.emit({ type: "duelEnd", result: this.getResult() });
      return;
    }

    this.state = {
      ...this.state,
      roundIndex: this.state.roundIndex + 1,
    };

    if (this.state.isDeadeye) {
      this.state = transitionPhase(this.state, DuelPhase.DEADEYE);
      this.emit({ type: "phaseChange" });
    }

    this.state = transitionPhase(this.state, DuelPhase.ZEGON_THINKING);
    this.emit({ type: "phaseChange" });

    void this.beginRound();
  }

  patchState(
    partial: Partial<Pick<DuelState, "ammo" | "blindsight" | "playerHp" | "zegonHp">>,
  ): void {
    this.state = { ...this.state, ...partial };
  }

  getResult(): DuelResult {
    const timesRead = this.state.roundLogs.filter(
      (log) => log.predictionCorrect,
    ).length;

    const winner = determineDuelWinner(this.state);
    const roundsPlayed = this.state.roundLogs.length;

    let score =
      roundsPlayed * SCORE.SURVIVED_ROUND +
      (SCORE.BLINDSIGHT_PENALTY_FACTOR * (100 - this.state.blindsight)) -
      timesRead * SCORE.TIMES_READ_PENALTY;

    if (winner === DuelWinner.PLAYER) {
      score += SCORE.VICTORY_BONUS;
    }

    return {
      winner,
      roundsPlayed,
      roundsWonByPlayer: this.state.roundsWonByPlayer,
      roundsWonByZegon: this.state.roundsWonByZegon,
      timesRead,
      finalBlindsight: this.state.blindsight,
      playerHp: this.state.playerHp,
      zegonHp: this.state.zegonHp,
      roundLogs: this.state.roundLogs,
      score: Math.max(0, Math.round(score)),
    };
  }
}

export { COMBAT };

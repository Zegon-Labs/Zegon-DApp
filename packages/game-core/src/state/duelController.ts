import { DEFAULT_DUEL_CONFIG, SCORE } from "../constants/index.js";
import {
  dailyStreakMultiplier,
  surpriseComboBonus,
} from "../progression/achievements.js";
import { IZegonBrain } from "../ai/IZegonBrain.js";
import {
  applyRoundOutcomeToHp,
  determineRoundWinner,
  resolveRound,
} from "../combat/resolveRound.js";
import { getGamblerWeapon } from "../modes/zegonArchetypes.js";
import { getStartingAmmo } from "../weapons/registry.js";
import { WeaponId } from "../types/index.js";
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

function resolveWeaponForRound(
  config: DuelConfig,
  roundIndex: number,
): WeaponId {
  if (config.archetype === "gambler" && config.seed) {
    return getGamblerWeapon(config.seed, roundIndex);
  }
  return config.weapon;
}

function buildInitialState(config: DuelConfig): DuelState {
  const weapon = resolveWeaponForRound(config, 0);
  return {
    phase: DuelPhase.IDLE,
    roundIndex: 0,
    playerHp: config.initialPlayerHp,
    zegonHp: config.initialZegonHp,
    weapon,
    ammo: getStartingAmmo(weapon),
    blindsight: 0,
    isDeadeye: false,
    playerHistory: [],
    roundsWonByPlayer: 0,
    roundsWonByZegon: 0,
    pendingZegonDecision: null,
    roundLogs: [],
    config,
  };
}

export class DuelController {
  private state: DuelState;
  private listeners: DuelEventListener[] = [];

  private surpriseStreak = 0;

  constructor(
    private readonly brain: IZegonBrain,
    config: Partial<DuelConfig> = {},
  ) {
    const mergedConfig: DuelConfig = {
      ...DEFAULT_DUEL_CONFIG,
      ...config,
    };

    this.state = buildInitialState(mergedConfig);
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

  /** Full state reset — required before a second startDuel on the same controller. */
  resetForNewDuel(config: Partial<DuelConfig> = {}): void {
    const freshArchetype = config.archetype != null || config.mode === "daily";
    const mergedConfig: DuelConfig = {
      ...DEFAULT_DUEL_CONFIG,
      ...(freshArchetype ? {} : this.state.config),
      ...config,
      modifiers:
        config.modifiers != null
          ? { ...config.modifiers }
          : freshArchetype
            ? undefined
            : this.state.config.modifiers,
    };
    this.surpriseStreak = 0;
    this.state = buildInitialState(mergedConfig);
  }

  async startDuel(): Promise<void> {
    if (this.state.phase === DuelPhase.DUEL_END) {
      this.resetForNewDuel();
    }
    this.state = transitionPhase(this.state, DuelPhase.ZEGON_THINKING);
    this.emit({ type: "phaseChange" });
    await this.beginRound();
  }

  private async beginRound(): Promise<void> {
    try {
      const ctx = buildRoundContext(this.state);
      const decision = await this.brain.decide(ctx);
      this.submitZegonDecision(decision);
    } catch (error) {
      console.error("[DuelController] beginRound failed:", error);
      throw error;
    }
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

    if (!outcome.predictionCorrect) {
      this.surpriseStreak += 1;
    } else {
      this.surpriseStreak = 0;
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
    if (this.state.playerHp <= 0 || this.state.zegonHp <= 0) {
      this.state = transitionPhase(this.state, DuelPhase.DUEL_END);
      this.emit({ type: "phaseChange" });
      this.emit({ type: "duelEnd", result: this.getResult() });
      return;
    }

    if (this.state.roundIndex + 1 >= this.state.config.maxRounds) {
      this.state = transitionPhase(this.state, DuelPhase.DUEL_END);
      this.emit({ type: "phaseChange" });
      this.emit({ type: "duelEnd", result: this.getResult() });
      return;
    }

    const nextRoundIndex = this.state.roundIndex + 1;
    const nextWeapon = resolveWeaponForRound(this.state.config, nextRoundIndex);
    this.state = {
      ...this.state,
      roundIndex: nextRoundIndex,
      ...(nextWeapon !== this.state.weapon
        ? { weapon: nextWeapon, ammo: getStartingAmmo(nextWeapon) }
        : {}),
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
    partial: Partial<
      Pick<DuelState, "ammo" | "blindsight" | "playerHp" | "zegonHp" | "isDeadeye">
    >,
  ): void {
    this.state = { ...this.state, ...partial };
  }

  getSurpriseStreak(): number {
    return this.surpriseStreak;
  }

  getResult(
    scoreOptions?: { dailyStreakDays?: number; surpriseStreak?: number },
  ): DuelResult {
    const timesRead = this.state.roundLogs.filter(
      (log) => log.predictionCorrect,
    ).length;

    const winner = determineDuelWinner(this.state);
    const roundsPlayed = this.state.roundLogs.length;

    let score =
      roundsPlayed * SCORE.SURVIVED_ROUND +
      SCORE.BLINDSIGHT_PENALTY_FACTOR * (100 - this.state.blindsight) -
      timesRead * SCORE.TIMES_READ_PENALTY;

    const streak = scoreOptions?.surpriseStreak ?? this.surpriseStreak;
    score += surpriseComboBonus(streak) * Math.max(0, streak - 1);

    if (winner === DuelWinner.PLAYER) {
      score += SCORE.VICTORY_BONUS;
    }

    const dailyMult = dailyStreakMultiplier(scoreOptions?.dailyStreakDays ?? 0);
    score = Math.round(score * dailyMult);

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
      score: Math.max(0, score),
    };
  }
}

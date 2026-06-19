import { getLanguage } from "../i18n/index.js";
import {
  assertCanPerformAction,
  DuelConfig,
  DuelController,
  DuelEvent,
  DuelPhase,
  DuelResult,
  DuelState,
  DuelWinner,
  DummyZegonBrain,
  IZegonBrain,
  PlayerAction,
  RoundContext,
  RoundOutcome,
  ZegonAction,
  ZegonDecision,
  createDailyDuel,
  decodeChallenge,
} from "@zegon/game-core";

export type BrainMode = "dummy" | "api";

export interface GameCoreAdapterOptions {
  config?: Partial<DuelConfig>;
  brainMode?: BrainMode;
  apiBaseUrl?: string;
  onEvent?: (event: DuelEvent) => void;
  customBrain?: IZegonBrain;
  forceOffline?: boolean;
}

class ApiZegonBrain implements IZegonBrain {
  private duelId: string | null = null;
  private sessionToken: string | null = null;

  constructor(
    private readonly apiBaseUrl: string,
    private readonly onSessionToken: (token: string) => void,
  ) {}

  setDuelId(duelId: string): void {
    this.duelId = duelId;
  }

  setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  async decide(ctx: RoundContext): Promise<ZegonDecision> {
    if (!this.duelId) {
      throw new Error("Duel not started — missing duelId");
    }

    const res = await fetch(`${this.apiBaseUrl}/api/duel/round/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duelId: this.duelId,
        context: ctx,
        locale: getLanguage(),
        sessionToken: this.sessionToken ?? undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`API commit failed: ${res.status}`);
    }

    const data = (await res.json()) as { taunt: string; sessionToken: string };
    if (data.sessionToken) {
      this.sessionToken = data.sessionToken;
      this.onSessionToken(data.sessionToken);
    }

    return {
      predictedPlayerMove: PlayerAction.FIRE_HIGH,
      zegonMove: ZegonAction.RELOAD,
      confidence: 0,
      taunt: data.taunt,
    };
  }
}

export class GameCoreAdapter {
  readonly controller: DuelController;
  private readonly brainMode: BrainMode;
  private readonly offline: boolean;
  private readonly apiBaseUrl: string;
  private readonly apiBrain: ApiZegonBrain | null;
  private _duelId: string | null = null;
  private _sessionToken: string | null = null;
  private _lastAttestationHash: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(options: GameCoreAdapterOptions = {}) {
    this.brainMode = options.brainMode ?? "dummy";
    this.offline = Boolean(options.customBrain || options.forceOffline);
    this.apiBaseUrl = options.apiBaseUrl ?? "";

    let config = options.config ?? {};
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get("challenge");
    if (challenge) {
      config = decodeChallenge(challenge);
    }

    const seed = config.seed ?? "standard";
    let brain: IZegonBrain;

    if (options.customBrain) {
      this.apiBrain = null;
      brain = options.customBrain;
    } else if (this.brainMode === "api" && !this.offline) {
      this.apiBrain = new ApiZegonBrain(this.apiBaseUrl, (token) => {
        this._sessionToken = token;
      });
      brain = this.apiBrain;
    } else {
      this.apiBrain = null;
      brain = new DummyZegonBrain(seed, getLanguage());
    }

    this.controller = new DuelController(brain, config);

    if (options.onEvent) {
      this.unsubscribe = this.controller.on((event) => {
        options.onEvent?.(event);
        if (event.type === "duelEnd" && "result" in event && event.result) {
          void this.recordDuelOnChain(event.result);
        }
      });
    }
  }

  async initDuel(
    mode: "standard" | "daily" | "tutorial" = "standard",
    options?: { config?: Partial<DuelConfig> },
  ): Promise<void> {
    if (options?.config) {
      Object.assign(this.controller.getState().config, options.config);
    }

    if (mode === "daily") {
      const dailyConfig = createDailyDuel();
      Object.assign(this.controller.getState().config, dailyConfig);
    }

    if (this.brainMode === "api" && !this.offline && mode !== "tutorial") {
      const res = await fetch(`${this.apiBaseUrl}/api/duel/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: this.controller.getState().config,
          locale: getLanguage(),
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to start duel: ${res.status}`);
      }
      const data = (await res.json()) as { duelId: string; sessionToken: string };
      this._duelId = data.duelId;
      this._sessionToken = data.sessionToken;
      this.apiBrain?.setDuelId(data.duelId);
      this.apiBrain?.setSessionToken(data.sessionToken);
    }

    await this.controller.startDuel();
  }

  patchState(
    partial: Partial<Pick<DuelState, "ammo" | "blindsight" | "playerHp" | "zegonHp">>,
  ): void {
    this.controller.patchState(partial);
  }

  getState() {
    return this.controller.getState();
  }

  getPhase(): DuelPhase {
    return this.controller.getState().phase;
  }

  getBlindsight(): number {
    return this.controller.getState().blindsight;
  }

  getPlayerHp(): number {
    return this.controller.getState().playerHp;
  }

  getZegonHp(): number {
    return this.controller.getState().zegonHp;
  }

  getAmmo(): number {
    return this.controller.getState().ammo;
  }

  getAvailableActions(): PlayerAction[] {
    return this.controller.getAvailableActions();
  }

  isAwaitingPlayer(): boolean {
    return this.getPhase() === DuelPhase.AWAITING_PLAYER;
  }

  isDuelOver(): boolean {
    return this.controller.isDuelOver();
  }

  getPendingTaunt(): string | null {
    return this.controller.getState().pendingZegonDecision?.taunt ?? null;
  }

  async submitAction(action: PlayerAction): Promise<RoundOutcome> {
    const state = this.controller.getState();
    assertCanPerformAction(state, action);

    if (this.brainMode === "api" && !this.offline && this._duelId) {
      const res = await fetch(`${this.apiBaseUrl}/api/duel/round/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId: this._duelId,
          roundIndex: state.roundIndex,
          playerAction: action,
          playerActionTimestamp: Date.now(),
          sessionToken: this._sessionToken ?? undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`API reveal failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        decision: ZegonDecision;
        sessionToken: string;
      };
      if (data.sessionToken) {
        this._sessionToken = data.sessionToken;
        this.apiBrain?.setSessionToken(data.sessionToken);
      }
      this.controller.setPendingDecision(data.decision);
    }

    return this.controller.submitPlayerAction(action);
  }

  private async recordDuelOnChain(result: DuelResult): Promise<void> {
    if (this.brainMode !== "api" || this.offline || !this._duelId) return;

    const resultCode =
      result.winner === DuelWinner.PLAYER
        ? 1
        : result.winner === DuelWinner.ZEGON
          ? 2
          : 0;

    const attestationHash =
      this._lastAttestationHash ??
      `${this._duelId}-${result.score}`.padEnd(64, "0").slice(0, 64);

    try {
      await fetch(`${this.apiBaseUrl}/api/duel/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId: this._duelId,
          result: resultCode,
          attestationHash,
          sessionToken: this._sessionToken ?? undefined,
        }),
      });
    } catch {
      // Non-fatal for local play
    }
  }

  getResult(): DuelResult {
    return this.controller.getResult();
  }

  getDuelId(): string | null {
    return this._duelId;
  }

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}

export { DuelPhase, PlayerAction };

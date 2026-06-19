import { getLanguage } from "../i18n/index.js";
import {
  DuelConfig,
  DuelController,
  DuelEvent,
  DuelPhase,
  DuelResult,
  DummyZegonBrain,
  PlayerAction,
  RoundOutcome,
  createDailyDuel,
  decodeChallenge,
} from "@zegon/game-core";

export type BrainMode = "dummy" | "api";

export interface GameCoreAdapterOptions {
  config?: Partial<DuelConfig>;
  brainMode?: BrainMode;
  apiBaseUrl?: string;
  onEvent?: (event: DuelEvent) => void;
}

export class ApiZegonBrain {
  constructor(
    private readonly duelId: string,
    private readonly apiBaseUrl: string,
  ) {}

  async decide(ctx: Parameters<DummyZegonBrain["decide"]>[0]) {
    const res = await fetch(`${this.apiBaseUrl}/api/duel/round/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duelId: this.duelId, context: ctx }),
    });
    if (!res.ok) {
      throw new Error(`API commit failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      decision: Awaited<ReturnType<DummyZegonBrain["decide"]>>;
      commitHash: string;
    };
    return data;
  }
}

export class GameCoreAdapter {
  readonly controller: DuelController;
  private readonly brainMode: BrainMode;
  private readonly apiBaseUrl: string;
  private _duelId: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(options: GameCoreAdapterOptions = {}) {
    this.brainMode = options.brainMode ?? "dummy";
    this.apiBaseUrl = options.apiBaseUrl ?? "";

    let config = options.config ?? {};
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get("challenge");
    if (challenge) {
      config = decodeChallenge(challenge);
    }

    const seed = config.seed ?? "standard";
    const brain = new DummyZegonBrain(seed, getLanguage());
    this.controller = new DuelController(brain, config);

    if (options.onEvent) {
      this.unsubscribe = this.controller.on(options.onEvent);
    }
  }

  async initDuel(mode: "standard" | "daily" = "standard"): Promise<void> {
    if (mode === "daily") {
      const dailyConfig = createDailyDuel();
      Object.assign(this.controller.getState().config, dailyConfig);
    }

    if (this.brainMode === "api") {
      const res = await fetch(`${this.apiBaseUrl}/api/duel/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: this.controller.getState().config }),
      });
      const data = (await res.json()) as { duelId: string };
      this._duelId = data.duelId;
    }

    await this.controller.startDuel();
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

  submitAction(action: PlayerAction): RoundOutcome {
    return this.controller.submitPlayerAction(action);
  }

  getResult(): DuelResult {
    return this.controller.getResult();
  }

  getDuelId(): string | null {
    return this._duelId;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}

export { DuelPhase, PlayerAction };

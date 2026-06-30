import { getLanguage } from "../i18n/index.js";
import { saveDuelSessionToken } from "../services/duelSessionStorage.js";
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
  DEFAULT_DUEL_CONFIG,
  IZegonBrain,
  DuelItemId,
  PlayerAction,
  RoundContext,
  RoundOutcome,
  ZegonAction,
  ZegonDecision,
  createDailyDuel,
  decodeChallenge,
  decodeChallengeCompact,
  createStandardDuelWithArchetype,
  type ZegonArchetypeId,
  withUniqueDuelSeed,
} from "@zegon/game-core";

function localDuelNonce(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return String(Date.now());
}

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
  private attestationHashes: string[] = [];
  private lastCommitTxHash: string | null = null;
  private lastBrainMode: "tee" | "dummy" = "dummy";

  constructor(
    private readonly apiBaseUrl: string,
    private readonly onSessionToken: (token: string) => void,
    private readonly onCommitMeta: (meta: {
      attestationHash?: string;
      commitTxHash?: string;
      brainMode: "tee" | "dummy";
    }) => void,
  ) {}

  setDuelId(duelId: string | null): void {
    this.duelId = duelId;
  }

  setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  getAttestationHashes(): readonly string[] {
    return this.attestationHashes;
  }

  getLastCommitTxHash(): string | null {
    return this.lastCommitTxHash;
  }

  getLastBrainMode(): "tee" | "dummy" {
    return this.lastBrainMode;
  }

  resetAttestations(): void {
    this.attestationHashes = [];
    this.lastCommitTxHash = null;
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
      const detail = await res.text().catch(() => "");
      throw new Error(
        `API commit failed: ${res.status}${detail ? ` — ${detail}` : ""}`,
      );
    }

    const data = (await res.json()) as {
      taunt: string;
      sessionToken: string;
      attestationHash?: string;
      commitTxHash?: string;
      brainMode?: "tee" | "dummy";
    };
    if (data.sessionToken) {
      this.sessionToken = data.sessionToken;
      this.onSessionToken(data.sessionToken);
    }
    if (data.attestationHash) {
      this.attestationHashes.push(data.attestationHash);
    }
    if (data.commitTxHash) {
      this.lastCommitTxHash = data.commitTxHash;
    }
    this.lastBrainMode = data.brainMode ?? "dummy";
    this.onCommitMeta({
      attestationHash: data.attestationHash,
      commitTxHash: data.commitTxHash,
      brainMode: this.lastBrainMode,
    });

    return {
      predictedPlayerMove: PlayerAction.FIRE,
      zegonMove: ZegonAction.DODGE,
      confidence: 0,
      taunt: data.taunt,
    };
  }
}

export class GameCoreAdapter {
  readonly controller: DuelController;
  private readonly brain: IZegonBrain;
  private readonly brainMode: BrainMode;
  private readonly offline: boolean;
  private readonly apiBaseUrl: string;
  private readonly apiBrain: ApiZegonBrain | null;
  private _duelId: string | null = null;
  private _sessionToken: string | null = null;
  private _lastAttestationHash: string | null = null;
  private _lastCommitTxHash: string | null = null;
  private _brainMode: "tee" | "dummy" = "dummy";
  private unsubscribe: (() => void) | null = null;

  constructor(options: GameCoreAdapterOptions = {}) {
    this.brainMode = options.brainMode ?? "dummy";
    this.offline = Boolean(options.customBrain || options.forceOffline);
    this.apiBaseUrl = options.apiBaseUrl ?? "";

    let config: Partial<DuelConfig> = options.config ?? {};
    if (!options.config) {
      const params = new URLSearchParams(window.location.search);
      const compact = params.get("c");
      const challenge = params.get("challenge");
      if (compact?.startsWith("v1.")) {
        try {
          config = decodeChallengeCompact(compact).config;
        } catch {
          /* ignore malformed compact token */
        }
      } else if (challenge) {
        config = decodeChallenge(challenge);
      }
    }

    const seed = config.seed ?? "standard";
    let brain: IZegonBrain;

    if (options.customBrain) {
      this.apiBrain = null;
      brain = options.customBrain;
    } else if (this.brainMode === "api" && !this.offline) {
      this.apiBrain = new ApiZegonBrain(this.apiBaseUrl, (token) => {
        this._sessionToken = token;
      }, (meta) => {
        this._brainMode = meta.brainMode;
        if (meta.commitTxHash) {
          this._lastCommitTxHash = meta.commitTxHash;
          try {
            sessionStorage.setItem("zegon-last-commit", meta.commitTxHash);
          } catch {
            /* ignore */
          }
        }
        if (meta.attestationHash) {
          this._lastAttestationHash = this.computeCompositeAttestation();
        }
      });
      brain = this.apiBrain;
    } else {
      this.apiBrain = null;
      brain = new DummyZegonBrain(seed, getLanguage());
    }

    this.brain = brain;
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
    options?: { config?: Partial<DuelConfig>; archetypeId?: string },
  ): Promise<void> {
    let mergedConfig: Partial<DuelConfig> = { ...options?.config };

    if (mode === "daily") {
      mergedConfig = { ...mergedConfig, ...createDailyDuel() };
    }

    if (mode === "standard") {
      mergedConfig = {
        ...mergedConfig,
        ...createStandardDuelWithArchetype(
          (options?.archetypeId ?? "reader") as ZegonArchetypeId,
        ),
      };
    }

    const useApi = this.brainMode === "api" && !this.offline && mode !== "tutorial";
    if (!useApi && mode !== "tutorial") {
      const base = mergedConfig as DuelConfig;
      mergedConfig = withUniqueDuelSeed(
        { ...DEFAULT_DUEL_CONFIG, ...base, mode: base.mode ?? mode } as DuelConfig,
        localDuelNonce(),
      );
    }

    this.controller.resetForNewDuel(mergedConfig);
    if (this.brain instanceof DummyZegonBrain) {
      this.brain.setSeed(this.controller.getState().config.seed);
    }
    this._duelId = null;
    this._sessionToken = null;
    this._lastAttestationHash = null;
    this._lastCommitTxHash = null;
    this._brainMode = "dummy";
    this.apiBrain?.resetAttestations();
    this.apiBrain?.setDuelId(null);
    this.apiBrain?.setSessionToken(null);

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
      saveDuelSessionToken(data.duelId, data.sessionToken);
      this.apiBrain?.setDuelId(data.duelId);
      this.apiBrain?.setSessionToken(data.sessionToken);
    }

    await this.controller.startDuel();
  }

  patchState(
    partial: Partial<
      Pick<
        DuelState,
        | "ammo"
        | "blindsight"
        | "readingStreak"
        | "playerHp"
        | "zegonHp"
        | "isDeadeye"
        | "equippedItem"
        | "itemCooldown"
      >
    >,
  ): void {
    this.controller.patchState(partial);
  }

  setEquippedItem(item: DuelItemId): void {
    this.controller.setEquippedItem(item);
  }

  getEquippedItem() {
    return this.controller.getEquippedItem();
  }

  getItemCooldown(): number {
    return this.controller.getItemCooldown();
  }

  getReadingStreak(): number {
    return this.controller.getReadingStreak();
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
        const detail = await res.text().catch(() => "");
        throw new Error(
          `API reveal failed: ${res.status}${detail ? ` — ${detail}` : ""}`,
        );
      }

      const data = (await res.json()) as {
        decision: ZegonDecision;
        sessionToken: string;
      };
      if (data.sessionToken) {
        this._sessionToken = data.sessionToken;
        this.apiBrain?.setSessionToken(data.sessionToken);
        saveDuelSessionToken(this._duelId, data.sessionToken);
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
      this.computeCompositeAttestation() ??
      `${this._duelId}-${result.score}`.padEnd(64, "0").slice(0, 64);

    try {
      const res = await fetch(`${this.apiBaseUrl}/api/duel/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duelId: this._duelId,
          result: resultCode,
          attestationHash,
          sessionToken: this._sessionToken ?? undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionToken?: string };
        if (data.sessionToken) {
          this._sessionToken = data.sessionToken;
          this.apiBrain?.setSessionToken(data.sessionToken);
          saveDuelSessionToken(this._duelId, data.sessionToken);
        }
      }
    } catch {
      // Non-fatal for local play
    }
  }

  getResult(options?: { dailyStreakDays?: number; surpriseStreak?: number }): DuelResult {
    return this.controller.getResult(options);
  }

  getSurpriseStreak(): number {
    return this.controller.getSurpriseStreak();
  }

  getDuelId(): string | null {
    return this._duelId;
  }

  getBrainMode(): "tee" | "dummy" {
    return this._brainMode;
  }

  getLastCommitTxHash(): string | null {
    return this._lastCommitTxHash ?? this.apiBrain?.getLastCommitTxHash() ?? null;
  }

  private computeCompositeAttestation(): string | null {
    const hashes = this.apiBrain?.getAttestationHashes() ?? [];
    if (hashes.length === 0) return null;
    if (hashes.length === 1) return hashes[0]!;
    let h = 0;
    const joined = hashes.join(":");
    for (let i = 0; i < joined.length; i++) {
      h = (Math.imul(31, h) + joined.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16).padStart(64, "0").slice(0, 64);
  }

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  destroy(): void {
    this.unsubscribe?.();
  }
}

export { DuelPhase, PlayerAction };

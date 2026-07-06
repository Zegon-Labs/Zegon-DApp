import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
} from "../adapters/GameCoreAdapter.js";
import { shouldUseServerApi, apiBaseUrl } from "../services/apiMode.js";
import { onLanguageChange, t, format, getLanguage } from "../i18n/index.js";
import type { ChallengeMeta, DuelConfig, DuelEvent, RoundOutcome, ZegonArchetypeId } from "@zegon/game-core";
import {
  ActionValidationError,
  COMBAT,
  DuelItemId,
  getEffectiveDeadeyeStreak,
  getItemCooldownRounds,
  previewSaloonStatsFromConfig,
  PlayerAction,
} from "@zegon/game-core";
import {
  blindsightShakeParams,
  blindsightSurgeStrength,
  drawScanlines,
} from "../ui/components.js";
import {
  deadeyeShakeParams,
  ReadingTensionLayer,
  scanlinePulseAlpha,
} from "../ui/readingTensionFx.js";
import {
  ArenaView,
  CombatHud,
  createHubConfirmModal,
  createLandingBackdrop,
  DuelHistoryLog,
  preloadHistoryPanel,
  preloadLandingBackdrop,
  preloadResultPanelAssets,
  preloadSideHudPanels,
  preloadZegonDamagePortrait,
  RoundResultToast,
  PlayerHandSprite,
  preloadPlayerHand,
  SpriteActionBar,
  preloadActionAssets,
  TopHudBar,
  preloadTopHudBar,
  SaloonLoadoutPanel,
  type SaloonLoadoutPanelLabels,
  type SpriteActionEntry,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { buildRoundSummary, type ActionLabelRole } from "../ui/roundSummary.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { safeShake } from "../ui/safeShake.js";
import { C, COLORS, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";
import { fetchProfile, getCachedProfile } from "../services/profile.js";
import { shotDamageMultiplierLabel } from "../utils/damageFormat.js";
import { consumeEquippedOnServer } from "../services/upgrades.js";
import { getWalletAddress } from "../services/wallet.js";
import { getPreferences } from "../services/preferences.js";
import {
  playActionSfx,
  playRoundOutcomeSfx,
  playSfx,
  playZegonMoveSfx,
  startSfxLoop,
  stopAllSfxLoops,
  stopSfxLoop,
} from "../services/sfx.js";
import {
  playRoundOutcomeVoice,
  playTauntVoice,
  playThinkingVoice,
  playVoice,
  resetVoiceState,
  stopAllVoice,
} from "../services/voice.js";

function duelItemLabel(item: DuelItemId): string {
  const strings = t();
  return {
    SMOKE: strings.itemSmoke,
    MIRROR: strings.itemMirror,
    PLATE: strings.itemPlate,
  }[item];
}

function actionLabel(action: PlayerAction | string, equippedItem?: DuelItemId): string {
  const strings = t();
  if (action === PlayerAction.USE_ITEM || action === "USE_ITEM") {
    return equippedItem
      ? `${strings.actionUseItem} (${duelItemLabel(equippedItem)})`
      : strings.actionUseItem;
  }
  if (action === PlayerAction.FIRE || action === "FIRE") return strings.actionFire;
  if (action === PlayerAction.DODGE || action === "DODGE") return strings.actionDodge;
  return String(action);
}

function playerFiredAction(action: string): boolean {
  return action === PlayerAction.FIRE || action === "FIRE";
}

function formatSubmitError(err: unknown): string {
  const strings = t();
  if (err instanceof ActionValidationError && err.message.includes("cooldown")) {
    return strings.errorItemCooldown;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export class DuelScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private arenaView!: ArenaView;
  private spriteActionBar!: SpriteActionBar;
  private readingTension!: ReadingTensionLayer;
  private scanlines!: Phaser.GameObjects.Graphics;
  private readingFxPhase = 0;
  private lastShakeAt = 0;
  private historyLog!: DuelHistoryLog;
  private statusLineText!: Phaser.GameObjects.Text;
  private chooseActionText!: Phaser.GameObjects.Text;
  private roundResultToast!: RoundResultToast;
  private mode: "standard" | "daily" = "standard";
  private challengeConfig?: Partial<DuelConfig>;
  private challengeMeta?: ChallengeMeta;
  private showingRoundResult = false;
  private lastRoundOutcome: RoundOutcome | null = null;
  private confirmModal: Phaser.GameObjects.Container | null = null;
  private topHudBar!: TopHudBar;
  private saloonLoadout!: SaloonLoadoutPanel;
  private combatHud!: CombatHud;
  private bootToken = 0;
  private zegonReadingActive = false;
  private duelStartTime = 0;
  private readingDotsPhase = 0;
  private readingDotsElapsed = 0;
  private glitchAmbientOn = false;
  private localeUnsub: (() => void) | null = null;
  private playerHandSprite!: PlayerHandSprite;

  constructor() {
    super("DuelScene");
  }

  init(data: {
    mode?: "standard" | "daily";
    archetypeId?: ZegonArchetypeId;
    challengeConfig?: Partial<DuelConfig>;
    challengeMeta?: ChallengeMeta;
    tiebreakRounds?: number;
  }): void {
    this.mode = data.mode ?? "standard";
    this.archetypeId = (data.challengeConfig?.archetype as ZegonArchetypeId) ?? data.archetypeId ?? "reader";
    this.challengeConfig = data.challengeConfig;
    this.challengeMeta = data.challengeMeta;
    this.tiebreakRounds = data.tiebreakRounds;
    this.showingRoundResult = false;
  }

  private archetypeId: ZegonArchetypeId = "reader";
  private tiebreakRounds?: number;

  preload(): void {
    preloadLandingBackdrop(this);
    preloadHistoryPanel(this);
    preloadPlayerHand(this);
    preloadActionAssets(this);
    preloadTopHudBar(this);
    preloadSideHudPanels(this);
    preloadZegonDamagePortrait(this);
    preloadResultPanelAssets(this);
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0, { duel: true });
    this.scanlines = drawScanlines(this, 98, 0);
    this.readingTension = new ReadingTensionLayer(this, 97);

    this.arenaView = new ArenaView(this, 5, {
      y: L.bottomStrip.arenaY,
      characterMaxH: L.bottomStrip.characterMaxH,
    });

    // Player hand + revolver — first-person overlay above arena, below strip.
    this.playerHandSprite = new PlayerHandSprite(this, 6);


    this.combatHud = new CombatHud(this, 9, undefined, { hideBlindsight: true });

    this.topHudBar = new TopHudBar(this, {
      onSettings: () => gameBridge.openSettingsOverlay(),
      onSurrender: () => this.showSurrenderConfirm(),
    });

    this.historyLog = new DuelHistoryLog(this, strings.history, 12);
    this.saloonLoadout = new SaloonLoadoutPanel(
      this,
      L.history.x,
      L.history.y + this.historyLog.panelHeight + L.loadout.gap,
      L.history.w,
      this.loadoutPanelLabels(),
      12,
    );
    this.roundResultToast = new RoundResultToast(this, 14);

    this.statusLineText = this.add.text(width / 2, L.bottomStrip.statusY, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "16px",
      color: COLORS.dust,
      letterSpacing: 1,
    }).setOrigin(0.5, 0).setResolution(2).setDepth(11);

    this.chooseActionText = this.add.text(width / 2, L.bottomStrip.chooseActionY, strings.chooseAction, {
      fontFamily: FONT_DISPLAY,
      fontSize: "20px",
      color: COLORS.bone,
      letterSpacing: 2,
    }).setOrigin(0.5, 0).setResolution(2).setDepth(11);

    this.adapter = new GameCoreAdapter({
      brainMode: shouldUseServerApi() ? "api" : "dummy",
      apiBaseUrl: apiBaseUrl(),
      config: this.challengeConfig,
      onEvent: (event) => this.handleEvent(event),
    });

    const strings2 = t();
    const initialHelp = this.buildActionHelpTexts();
    const actionEntries: SpriteActionEntry[] = [
      { label: strings2.actionFire,   action: PlayerAction.FIRE,     helpText: initialHelp[0] },
      { label: strings2.actionDodge,  action: PlayerAction.DODGE,    helpText: initialHelp[1] },
      { label: strings2.itemSmoke,    action: PlayerAction.USE_ITEM, item: DuelItemId.SMOKE,  helpText: initialHelp[2] },
      { label: strings2.itemMirror,   action: PlayerAction.USE_ITEM, item: DuelItemId.MIRROR, helpText: initialHelp[3] },
      { label: strings2.itemPlate,    action: PlayerAction.USE_ITEM, item: DuelItemId.PLATE,  helpText: initialHelp[4] },
    ];
    this.spriteActionBar = new SpriteActionBar(this, {
      entries: actionEntries,
      onAction: (action, item) => {
        if (item) this.adapter?.setEquippedItem(item);
        void this.submitPlayerAction(action);
      },
      depth: 12,
    });

    void this.bootDuel();

    this.localeUnsub = onLanguageChange(() => this.refreshLocale());
  }

  private refreshLocale(): void {
    const strings = t();
    this.chooseActionText.setText(strings.chooseAction);
    this.spriteActionBar.refreshLabels([
      actionLabel(PlayerAction.FIRE,     this.adapter?.getEquippedItem()),
      actionLabel(PlayerAction.DODGE,    this.adapter?.getEquippedItem()),
      strings.itemSmoke,
      strings.itemMirror,
      strings.itemPlate,
    ]);
    this.historyLog.setTitle(strings.history);
    this.refreshPhaseStatus();
    this.updateHud();
    this.updateActionBarHelp();
    this.refreshRoundResultIfVisible();
    if (this.confirmModal) {
      this.confirmModal.destroy(true);
      this.confirmModal = null;
      this.showSurrenderConfirm();
    }
    this.roundResultToast.refreshLocale();
    if (this.adapter) {
      const profile = getCachedProfile(getWalletAddress() ?? "");
      this.saloonLoadout.refreshLocale(
        this.loadoutPanelLabels(),
        this.adapter.getState().config,
        profile?.upgrades,
        profile?.equippedConsumable,
        getLanguage(),
      );
    }
  }

  private refreshPhaseStatus(): void {
    if (!this.adapter) return;
    const strings = t();
    const phase = this.adapter.getPhase();
    if (phase === DuelPhase.ZEGON_THINKING) {
      this.statusLineText
        .setText(`${this.zegonReadingBase()}.`)
        .setColor(COLORS.ember);
    } else if (phase === DuelPhase.AWAITING_PLAYER) {
      this.statusLineText.setText(strings.lockedIn).setColor(COLORS.dust);
    } else if (phase === DuelPhase.DEADEYE) {
      this.statusLineText.setText(strings.deadeye).setColor(COLORS.ember);
    }
  }

  private buildRoundSummaryFor(outcome: RoundOutcome) {
    const config = this.adapter.getState().config;
    const deadeyeStreak = getEffectiveDeadeyeStreak(config.modifiers);
    return buildRoundSummary(
      outcome,
      t(),
      (action, role: ActionLabelRole) => {
        const strings = t();
        if (role === "predicted" && (action === PlayerAction.USE_ITEM || action === "USE_ITEM")) {
          return strings.actionUseItemShort;
        }
        return actionLabel(action, outcome.itemUsed ?? this.adapter.getEquippedItem());
      },
      deadeyeStreak,
      {
        playerMaxHp: config.initialPlayerHp,
        zegonMaxHp: config.initialZegonHp,
      },
    );
  }

  private refreshRoundResultIfVisible(): void {
    if (!this.showingRoundResult || !this.lastRoundOutcome) return;
    this.roundResultToast.replaceLines(
      this.buildRoundSummaryFor(this.lastRoundOutcome).lines,
    );
  }

  private computeDuelTip(): string {
    if (!this.adapter) return t().duelTipDefault;
    const strings = t();
    const state = this.adapter.getState();
    const streak = this.adapter.getReadingStreak();
    const history = state.playerHistory;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    if (state.isDeadeye) return strings.duelTipDeadeye;
    if (last != null && last === prev) return strings.duelTipRepeat;
    if (streak >= 1) return strings.duelTipStreak1;
    if (this.adapter.getItemCooldown() <= 0 && this.adapter.isAwaitingPlayer()) {
      return strings.duelTipItemReady;
    }
    return strings.duelTipDefault;
  }

  private loadoutPanelLabels(): SaloonLoadoutPanelLabels {
    const strings = t();
    return {
      title: strings.duelLoadoutTitle,
      upgradesSection: strings.duelLoadoutUpgrades,
      relicsSection: strings.duelLoadoutRelics,
      hits: strings.duelUpgradeBadgeHits,
      shot: strings.duelUpgradeBadgeShot,
      deadeye: strings.duelUpgradeBadgeDeadeye,
      cooldown: strings.duelUpgradeBadgeCooldown,
      ammo: strings.duelUpgradeBadgeAmmo,
    };
  }

  private buildActionHelpTexts(): string[] {
    const strings = t();
    const tip = this.computeDuelTip();
    const tipBlock = `\n\n${tip}`;
    const itemTip =
      this.adapter?.getItemCooldown() <= 0 && this.adapter?.isAwaitingPlayer()
        ? `\n\n${strings.duelTipItemReady}`
        : "";
    const config = this.adapter?.getState().config;
    const cooldownRounds = config ? getItemCooldownRounds(config) : 4;
    const cooldown = `\n\n${format(strings.itemCooldownNote, { n: cooldownRounds })}`;
    const stats = config ? previewSaloonStatsFromConfig(config) : null;
    const fireDesc =
      stats && stats.shotDamage > COMBAT.HIT_DAMAGE
        ? format(strings.actionDescFireUpgraded, {
            dmg: shotDamageMultiplierLabel(stats.shotDamage),
          })
        : strings.actionDescFire;

    return [
      `${fireDesc}${tipBlock}`,
      `${strings.actionDescDodge}${tipBlock}`,
      `${strings.itemDescSmoke}${cooldown}${itemTip}`,
      `${strings.itemDescMirror}${cooldown}${itemTip}`,
      `${strings.itemDescPlate}${cooldown}${itemTip}`,
    ];
  }

  private updateActionBarHelp(): void {
    this.spriteActionBar?.refreshHelpTexts(this.buildActionHelpTexts());
  }

  private showSurrenderConfirm(): void {
    const strings = t();
    this.confirmModal?.destroy(true);
    this.confirmModal = createHubConfirmModal(this, {
      title: strings.duelSurrenderTitle,
      body: strings.duelSurrenderBody,
      confirmLabel: strings.duelSurrenderConfirm,
      cancelLabel: strings.duelSurrenderCancel,
      onConfirm: () => {
        this.confirmModal = null;
        this.adapter.destroy();
        gameBridge.navigate({ type: "hub" });
      },
      onCancel: () => {
        this.confirmModal = null;
      },
    });
  }

  private async bootDuel(): Promise<void> {
    const token = ++this.bootToken;
    const address = getWalletAddress() ?? "";
    const profile = getCachedProfile(address);
    const equipped = profile?.equippedConsumable ?? null;
    try {
      // Duel length only applies to standard duels; daily stays fixed and
      // challenges inherit the challenger's config.
      const lengthConfig =
        this.mode === "standard" && !this.challengeConfig && this.tiebreakRounds
          ? { tiebreakRounds: this.tiebreakRounds }
          : undefined;
      await this.adapter.initDuel(this.mode, {
        archetypeId: this.mode === "standard" ? this.archetypeId : undefined,
        config: this.challengeConfig ?? lengthConfig,
        upgradeLevels: profile?.upgrades,
        equippedConsumable: equipped,
      });
      if (token !== this.bootToken) return;
      if (address && equipped) {
        void consumeEquippedOnServer(address).then(() => fetchProfile(address));
      }
      this.duelStartTime = Date.now();
      resetVoiceState();
      playSfx("duel_start");
      playVoice("step_into_dust", { delayMs: 420 });
      this.updateHud();
      this.updateActionButtons();
    } catch (err) {
      if (token !== this.bootToken) return;
      this.statusLineText.setText(formatSubmitError(err)).setColor(COLORS.ember);
      this.spriteActionBar.setEnabledMap(false, new Set());
    }
  }

  private showRoundResult(outcome: RoundOutcome): void {
    this.lastRoundOutcome = outcome;
    const summary = this.buildRoundSummaryFor(outcome);
    this.showingRoundResult = true;
    playSfx("round_resolve");
    this.roundResultToast.show(summary.lines, () => {
      this.showingRoundResult = false;
      this.updateActionButtons();
    });
    this.spriteActionBar.resetHoverAll();
    this.updateActionButtons();
  }

  private playArenaFlash(color: number, alpha = 0.7, radius = 60): void {
    const { width } = this.scale;
    const flash = this.add.circle(width / 2, L.bottomStrip.arenaY + 45, radius, color, alpha).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 280,
      onComplete: () => flash.destroy(),
    });
    safeShake(this, 90, 0.002);
  }

  private playFireFlash(): void {
    this.playArenaFlash(C.ember);
  }

  private playZegonHitFlash(): void {
    this.playArenaFlash(C.blood, 0.82, 72);
    this.cameras.main.flash(200, 179, 18, 43);
    safeShake(this, 110, 0.003);
    this.arenaView.pulseHit();
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    const state = this.adapter.getState();
    const playerHpNow = this.adapter.getPlayerHp();
    const zegonHpNow = this.adapter.getZegonHp();
    const prevPlayerHp = playerHpNow + outcome.playerDamage;
    const prevZegonHp = zegonHpNow + outcome.zegonDamage;

    this.showRoundResult(outcome);
    playRoundOutcomeSfx({
      playerAction: outcome.playerAction,
      zegonMove: outcome.zegonDecision.zegonMove,
      playerDamage: outcome.playerDamage,
      zegonDamage: outcome.zegonDamage,
      blindsightDelta: outcome.blindsightDelta,
    });
    playRoundOutcomeVoice({
      playerDamage: outcome.playerDamage,
      zegonDamage: outcome.zegonDamage,
      predictionCorrect: outcome.predictionCorrect,
    });
    if (outcome.blindsightDelta > 0) {
      this.triggerBlindsightSurge(outcome.blindsightDelta);
    }
    if (outcome.playerDamage > 0) {
      const anchor = this.combatHud.playerDamageAnchor();
      showFloatingDamage(
        this,
        anchor.x,
        anchor.y - 18,
        outcome.playerDamage,
        "player",
        state.config.initialPlayerHp,
      );
      this.combatHud.playPlayerHit(prevPlayerHp, playerHpNow, state.config.initialPlayerHp);
      this.arenaView.pulsePlayerHit();
    }
    if (outcome.zegonDamage > 0) {
      const anchor = this.combatHud.zegonDamageAnchor();
      showFloatingDamage(
        this,
        anchor.x,
        anchor.y - 18,
        outcome.zegonDamage,
        "zegon",
        state.config.initialZegonHp,
      );
      this.combatHud.playZegonHit(prevZegonHp, zegonHpNow, state.config.initialZegonHp);
      this.playZegonHitFlash();
    } else if (
      playerFiredAction(outcome.playerAction) &&
      outcome.playerDamage === 0
    ) {
      this.playArenaFlash(C.ember, 0.38, 44);
    }
    if (
      outcome.zegonDecision.zegonMove === "FIRE"
    ) {
      this.time.delayedCall(120, () => {
        playZegonMoveSfx(outcome.zegonDecision.zegonMove);
        this.playFireFlash();
      });
    } else if (
      outcome.zegonDecision.zegonMove === "DODGE"
    ) {
      playZegonMoveSfx(outcome.zegonDecision.zegonMove);
    }
  }

  private handleEvent(event: DuelEvent): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.setZegonReadingActive(true);
        startSfxLoop("zegon_thinking", { volume: 0.32 });
        playThinkingVoice();
        this.chooseActionText.setAlpha(0.35);
        if (!this.showingRoundResult) {
          this.roundResultToast.hide();
        }
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        stopSfxLoop("zegon_thinking");
        this.setZegonReadingActive(false);
        if (this.showingRoundResult) {
          this.roundResultToast.hide(true);
        }
        playSfx("your_turn");
        const taunt = this.adapter.getPendingTaunt();
        if (!playTauntVoice(taunt)) {
          playVoice("your_turn_outlaw", { delayMs: 280 });
        }
        this.statusLineText.setText(strings.lockedIn).setColor(COLORS.dust);
        this.chooseActionText.setAlpha(1);
        this.updateActionBarHelp();
      } else if (phase === DuelPhase.DEADEYE) {
        stopSfxLoop("zegon_thinking");
        this.setZegonReadingActive(false);
        playSfx("deadeye_sting");
        playVoice("deadeye", { delayMs: 220 });
        this.statusLineText.setText(strings.deadeye).setColor(COLORS.ember);
        this.cameras.main.flash(280, 255, 77, 46);
        safeShake(this, 120, 0.0025);
      }
    }

    if (event.type === "roundResolved" && event.outcome) {
      this.onRoundResolved(event.outcome);
    }

    if (event.type === "duelEnd") {
      if (this.showingRoundResult) {
        this.showingRoundResult = false;
        this.roundResultToast.hide(false);
      }
      const address = getWalletAddress();
      const profile = address ? getCachedProfile(address) : null;
      const scoreOptions = {
        dailyStreakDays: profile?.stats?.streakDays ?? 0,
        surpriseStreak: this.adapter.getSurpriseStreak(),
      };
      const result = this.adapter.getResult(scoreOptions);
      this.time.delayedCall(800, () => {
        if (!this.scene.isActive()) return;
        this.scene.start("ResultScene", {
          result,
          duelId: this.adapter.getDuelId(),
          apiBaseUrl: this.adapter.getApiBaseUrl(),
          mode: this.mode,
          archetype: this.archetypeId,
          brainMode: this.adapter.getBrainMode(),
          scoreOptions,
          challengeMeta: this.challengeMeta,
          duelStartTime: this.duelStartTime,
          tiebreakRounds: this.adapter.getState().config.tiebreakRounds,
        });
      });
    }

    this.updateHud();
    this.updateActionButtons();
    this.updateArena();
  }

  update(_time: number, delta: number): void {
    if (!this.adapter) return;

    const prefs = getPreferences();
    const blindsight = this.adapter.getBlindsight();
    const state = this.adapter.getState();
    const deadeyeStreak = getEffectiveDeadeyeStreak(state.config.modifiers);
    const deadeye = this.adapter.getReadingStreak() >= deadeyeStreak;

    this.readingFxPhase += (0.002 + (blindsight / 100) * 0.004) * delta;
    this.readingTension.update({
      blindsight,
      deadeye,
      phase: this.readingFxPhase,
      enabled: prefs.glitchEffects,
    });

    this.scanlines.setAlpha(
      prefs.scanlines ? scanlinePulseAlpha(blindsight, 0, true) : 0,
    );

    if (deadeye && prefs.glitchEffects) {
      const shake = deadeyeShakeParams(blindsight);
      if (this.time.now - this.lastShakeAt >= shake.intervalMs) {
        this.lastShakeAt = this.time.now;
        safeShake(this, shake.durationMs, shake.intensity);
      }
    } else {
      const shake = blindsightShakeParams(blindsight);
      if (shake && this.time.now - this.lastShakeAt >= shake.intervalMs) {
        this.lastShakeAt = this.time.now;
        safeShake(this, shake.durationMs, shake.intensity);
      }
    }

    this.cameras.main.setZoom(1);

    this.tickZegonReadingAnim(delta);
    this.syncGlitchAmbient(blindsight);
  }

  private syncGlitchAmbient(blindsight: number): void {
    const prefs = getPreferences();
    const shouldPlay = prefs.glitchEffects && blindsight > 55;
    if (shouldPlay && !this.glitchAmbientOn) {
      this.glitchAmbientOn = true;
      startSfxLoop("glitch_ambient", { volume: 0.14 });
    } else if (!shouldPlay && this.glitchAmbientOn) {
      this.glitchAmbientOn = false;
      stopSfxLoop("glitch_ambient");
    }
  }

  private zegonReadingBase(): string {
    return t().zegonReading.replace(/\.+$/, "");
  }

  private setZegonReadingActive(active: boolean): void {
    this.zegonReadingActive = active;
    this.readingDotsElapsed = 0;
    this.readingDotsPhase = 0;
    if (active) {
      this.statusLineText
        .setText(`${this.zegonReadingBase()}.`)
        .setColor(COLORS.ember)
        .setAlpha(1);
    } else {
      this.statusLineText.setAlpha(1);
      this.chooseActionText.setAlpha(1);
    }
  }

  private tickZegonReadingAnim(delta: number): void {
    if (!this.zegonReadingActive) return;

    this.readingDotsElapsed += delta;
    const interval = 400;
    while (this.readingDotsElapsed >= interval) {
      this.readingDotsElapsed -= interval;
      this.readingDotsPhase = (this.readingDotsPhase + 1) % 3;
      const dots = ".".repeat(this.readingDotsPhase + 1);
      this.statusLineText.setText(`${this.zegonReadingBase()}${dots}`);
    }

    const pulse = 0.92 + 0.08 * Math.sin(this.time.now * 0.004);
    this.statusLineText.setAlpha(pulse);
    this.chooseActionText.setAlpha(0.72);
  }

  private triggerBlindsightSurge(delta: number): void {
    const strength = blindsightSurgeStrength(delta);
    if (strength <= 0) return;
    safeShake(this, 90 + strength * 80, 0.002 + strength * 0.003);
    this.cameras.main.flash(130, 179, 18, 43, false, undefined, 0.04 + strength * 0.06);
    this.readingFxPhase += 1.2 + strength * 1.5;
  }

  private updateArena(): void {
    const blindsight = this.adapter.getBlindsight();
    const state = this.adapter.getState();
    const deadeyeStreak = getEffectiveDeadeyeStreak(state.config.modifiers);
    this.arenaView.update(
      blindsight,
      this.adapter.getReadingStreak() >= deadeyeStreak,
      this.adapter.getZegonHp(),
      state.config.initialZegonHp,
    );
  }

  private updateHud(): void {
    const strings = t();
    const state = this.adapter.getState();
    const blindsight = this.adapter.getBlindsight();
    const readingStreak = this.adapter.getReadingStreak();
    const equipped = this.adapter.getEquippedItem();

    const lines = state.roundLogs.map((log, i) =>
      `R${i + 1} ${actionLabel(log.playerAction, log.itemUsed ?? equipped)}`.toUpperCase(),
    );
    this.historyLog.update({
      roundLabel: `${strings.round} ${String(state.roundIndex + 1).padStart(2, "0")}`.toUpperCase(),
      roundIndex: state.roundIndex,
      lines,
    });

    const deadeyeStreak = getEffectiveDeadeyeStreak(state.config.modifiers);

    const itemCooldown = this.adapter.getItemCooldown();
    const stats = previewSaloonStatsFromConfig(state.config);
    const hitsRemaining = Math.max(0, Math.ceil(this.adapter.getPlayerHp() / COMBAT.HIT_DAMAGE));
    const playerHitsLabel =
      stats.maxHits > Math.ceil(COMBAT.INITIAL_HP / COMBAT.HIT_DAMAGE)
        ? format(strings.duelHitsRemaining, {
            current: hitsRemaining,
            max: stats.maxHits,
          })
        : undefined;

    const profile = getCachedProfile(getWalletAddress() ?? "");
    this.saloonLoadout.update(
      state.config,
      profile?.upgrades,
      profile?.equippedConsumable,
      getLanguage(),
    );

    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      playerMaxHp: state.config.initialPlayerHp,
      zegonMaxHp: state.config.initialZegonHp,
      playerHitsLabel,
      blindsight,
      readingStreak,
      deadeyeStreak,
      itemLabel: "",
      itemStatus: "",
      itemReady: itemCooldown <= 0,
      itemCooldown,
      playerLabel: strings.hudYou,
      zegonLabel: strings.hudZegon,
      hudItem: strings.hudItem,
      hudStatus: strings.hudStatus,
      blindsightLabel: `${strings.hudBlindsight}  ${readingStreak}/${deadeyeStreak}`,
      blindsightFlavor: strings.blindsightFlavor,
      nextMoveHint: "",
    });

    this.topHudBar.updateStreak(strings.hudBlindsight, readingStreak, deadeyeStreak);
    this.updateActionBarHelp();
  }

  private updateActionButtons(): void {
    if (this.showingRoundResult) {
      this.spriteActionBar.setEnabledMap(false, new Set());
      return;
    }
    const awaiting = this.adapter.isAwaitingPlayer();
    const available = new Set(this.adapter.getAvailableActions());
    this.spriteActionBar.setEnabledMap(awaiting, available);
  }

  private async submitPlayerAction(action: PlayerAction): Promise<void> {
    if (this.showingRoundResult) return;
    if (!this.adapter.isAwaitingPlayer()) return;
    if (!this.adapter.getAvailableActions().includes(action)) return;

    this.spriteActionBar.setDimmedAll(true);
    playActionSfx(action);
    if (action === PlayerAction.FIRE) {
      this.playerHandSprite.playFire();
    }
    try {
      await this.adapter.submitAction(action);
    } catch (err) {
      this.statusLineText.setText(formatSubmitError(err)).setColor(COLORS.ember);
    } finally {
      this.spriteActionBar.setDimmedAll(false);
      this.updateActionButtons();
    }
  }

  shutdown(): void {
    this.localeUnsub?.();
    this.localeUnsub = null;
    this.bootToken++;
    this.setZegonReadingActive(false);
    stopAllVoice();
    stopAllSfxLoops();
    this.glitchAmbientOn = false;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.cameras.main.setZoom(1);
    this.confirmModal?.destroy(true);
    this.confirmModal = null;
    this.topHudBar?.destroy();
    this.saloonLoadout?.destroy();
    this.combatHud?.destroy();
    this.adapter?.destroy();
    this.spriteActionBar?.destroy();
    this.arenaView?.destroy();
    this.playerHandSprite?.destroy();
    this.historyLog?.destroy();
    this.roundResultToast?.destroy();
  }
}

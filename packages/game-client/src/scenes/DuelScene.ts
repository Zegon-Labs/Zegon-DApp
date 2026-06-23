import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
} from "../adapters/GameCoreAdapter.js";
import { shouldUseServerApi, apiBaseUrl } from "../services/apiMode.js";
import { onLanguageChange, t } from "../i18n/index.js";
import type { DuelEvent, RoundOutcome, ZegonArchetypeId } from "@zegon/game-core";
import {
  ActionValidationError,
  DuelItemId,
  getEffectiveDeadeyeStreak,
  ITEM,
  PlayerAction,
} from "@zegon/game-core";
import {
  blindsightBlinkAlpha,
  blindsightShakeParams,
  blindsightSurgeStrength,
  drawGlitchOverlay,
  drawScanlines,
  scanlinePulseAlpha,
} from "../ui/components.js";
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
  type SpriteActionEntry,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { buildRoundSummary, type ActionLabelRole } from "../ui/roundSummary.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { C, COLORS, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";
import { getCachedProfile } from "../services/profile.js";
import { getWalletAddress } from "../services/wallet.js";
import { persistDuelProgression } from "../services/duelProgression.js";
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
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private blinkOverlay!: Phaser.GameObjects.Rectangle;
  private glitchPulse = 0;
  private glitchIntensityCache = -1;
  private lastShakeAt = 0;
  private historyLog!: DuelHistoryLog;
  private statusLineText!: Phaser.GameObjects.Text;
  private chooseActionText!: Phaser.GameObjects.Text;
  private roundResultToast!: RoundResultToast;
  private mode: "standard" | "daily" = "standard";
  private showingRoundResult = false;
  private confirmModal: Phaser.GameObjects.Container | null = null;
  private topHudBar!: TopHudBar;
  private combatHud!: CombatHud;
  private bootToken = 0;
  private zegonReadingActive = false;
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
  }): void {
    this.mode = data.mode ?? "standard";
    this.archetypeId = data.archetypeId ?? "reader";
    this.showingRoundResult = false;
  }

  private archetypeId: ZegonArchetypeId = "reader";

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
    const { width, height } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0, { duel: true });
    this.scanlines = drawScanlines(this, 98, 0.06);
    this.glitchOverlay = drawGlitchOverlay(this, 0, 97);
    this.blinkOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, C.blood, 1)
      .setDepth(96)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

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
    this.updateHud();
    this.updateActionBarHelp();
    this.roundResultToast.refreshLocale();
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

  private buildActionHelpTexts(): string[] {
    const strings = t();
    const tip = this.computeDuelTip();
    const tipBlock = `\n\n${tip}`;
    const itemTip =
      this.adapter?.getItemCooldown() <= 0 && this.adapter?.isAwaitingPlayer()
        ? `\n\n${strings.duelTipItemReady}`
        : "";
    const cooldown = `\n\n${strings.itemCooldownNote.replace("{n}", String(ITEM.COOLDOWN_ROUNDS))}`;

    return [
      `${strings.actionDescFire}${tipBlock}`,
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
    try {
      await this.adapter.initDuel(this.mode, {
        archetypeId: this.mode === "standard" ? this.archetypeId : undefined,
      });
      if (token !== this.bootToken) return;
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
    const deadeyeStreak = getEffectiveDeadeyeStreak(
      this.adapter.getState().config.modifiers,
    );
    const summary = buildRoundSummary(
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
    );
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
    this.cameras.main.shake(100, 0.003);
  }

  private playFireFlash(): void {
    this.playArenaFlash(C.ember);
  }

  private playZegonHitFlash(): void {
    this.playArenaFlash(C.blood, 0.82, 72);
    this.cameras.main.flash(200, 179, 18, 43);
    this.cameras.main.shake(130, 0.0045);
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
      showFloatingDamage(this, anchor.x, anchor.y - 18, outcome.playerDamage, "player");
      this.combatHud.playPlayerHit(prevPlayerHp, playerHpNow, state.config.initialPlayerHp);
      this.arenaView.pulsePlayerHit();
    }
    if (outcome.zegonDamage > 0) {
      const anchor = this.combatHud.zegonDamageAnchor();
      showFloatingDamage(this, anchor.x, anchor.y - 18, outcome.zegonDamage, "zegon");
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
        this.cameras.main.shake(200, 0.008);
      }
    }

    if (event.type === "roundResolved" && event.outcome) {
      this.onRoundResolved(event.outcome);
    }

    if (event.type === "duelEnd") {
      const address = getWalletAddress();
      const profile = address ? getCachedProfile(address) : null;
      const scoreOptions = {
        dailyStreakDays: profile?.stats?.streakDays ?? 0,
        surpriseStreak: this.adapter.getSurpriseStreak(),
      };
      const result = this.adapter.getResult(scoreOptions);
      if (address) {
        void persistDuelProgression(address, result, {
          surpriseStreak: this.adapter.getSurpriseStreak(),
        });
      }
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
        });
      });
    }

    this.updateHud();
    this.updateActionButtons();
    this.updateArena();
  }

  update(_time: number, delta: number): void {
    if (!this.adapter) return;

    const blindsight = this.adapter.getBlindsight();
    const intensity = blindsight / 100;

    this.syncGlitchOverlay(intensity);
    this.glitchPulse += (0.001 + intensity * 0.006) * delta;

    this.scanlines.setAlpha(scanlinePulseAlpha(blindsight, this.glitchPulse));
    this.blinkOverlay.setAlpha(blindsightBlinkAlpha(blindsight, this.glitchPulse));

    const overlayBase = 0.22 + intensity * 0.68;
    if (intensity > 0.18) {
      const flicker = 0.86 + Math.sin(this.glitchPulse * 3.4) * 0.14 * intensity;
      this.glitchOverlay.setAlpha(overlayBase * flicker);
    } else {
      this.glitchOverlay.setAlpha(overlayBase);
    }

    const shake = blindsightShakeParams(blindsight);
    if (shake && this.time.now - this.lastShakeAt >= shake.intervalMs) {
      this.lastShakeAt = this.time.now;
      this.cameras.main.shake(shake.durationMs, shake.intensity);
    }

    if (intensity > 0.5) {
      this.cameras.main.setZoom(1 + (intensity - 0.5) * 0.045);
    } else {
      this.cameras.main.setZoom(1);
    }

    this.tickZegonReadingAnim(delta);
    this.syncGlitchAmbient(blindsight);
  }

  private syncGlitchAmbient(blindsight: number): void {
    const prefs = getPreferences();
    const shouldPlay = prefs.glitchEffects && blindsight > 60;
    if (shouldPlay && !this.glitchAmbientOn) {
      this.glitchAmbientOn = true;
      startSfxLoop("glitch_ambient", { volume: 0.22 });
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

    const pulse = 0.72 + 0.28 * Math.sin(this.time.now * 0.008);
    this.statusLineText.setAlpha(pulse);
    this.chooseActionText.setAlpha(0.22 + pulse * 0.18);
  }

  private syncGlitchOverlay(intensity: number): void {
    const bucket = Math.round(intensity * 20) / 20;
    if (bucket === this.glitchIntensityCache) return;
    this.glitchIntensityCache = bucket;
    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity, 97);
  }

  private triggerBlindsightSurge(delta: number): void {
    const strength = blindsightSurgeStrength(delta);
    if (strength <= 0) return;
    this.cameras.main.shake(100 + strength * 120, 0.0025 + strength * 0.007);
    this.cameras.main.flash(140, 179, 18, 43, false, undefined, 0.06 + strength * 0.2);
    this.glitchPulse += 0.8 + strength * 1.4;
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
    this.syncGlitchOverlay(blindsight / 100);
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
    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      playerMaxHp: state.config.initialPlayerHp,
      zegonMaxHp: state.config.initialZegonHp,
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
    this.combatHud?.destroy();
    this.adapter?.destroy();
    this.spriteActionBar?.destroy();
    this.arenaView?.destroy();
    this.playerHandSprite?.destroy();
    this.historyLog?.destroy();
    this.roundResultToast?.destroy();
  }
}

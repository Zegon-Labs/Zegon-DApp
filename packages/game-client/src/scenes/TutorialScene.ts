import Phaser from "phaser";
import { format, getLanguage, onLanguageChange, t } from "../i18n/index.js";
import type { LocaleStrings } from "../i18n/index.js";
import {
  GameCoreAdapter,
  DuelPhase,
} from "../adapters/GameCoreAdapter.js";
import { DuelItemId, estimateLiveScoreRaw, scoreDeltaFromLastRound, getEffectiveDeadeyeStreak, ITEM, PlayerAction } from "@zegon/game-core";
import type { DuelEvent, RoundOutcome } from "@zegon/game-core";
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
  itemCooldownLabel,
  createHubPracticeStrip,
  createHubTutorialModal,
  createLandingBackdrop,
  preloadActionAssets,
  preloadLandingBackdrop,
  preloadPlayerHand,
  preloadResultPanelAssets,
  preloadSideHudPanels,
  preloadTopHudBar,
  preloadTutorialPanelAssets,
  PlayerHandSprite,
  SpriteActionBar,
  TopHudBar,
  type SpriteActionEntry,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { safeShake } from "../ui/safeShake.js";
import { C, COLORS, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";
import {
  playActionSfx,
  playRoundOutcomeSfx,
  playSfx,
  playZegonMoveSfx,
  startSfxLoop,
  stopAllSfxLoops,
  stopSfxLoop,
} from "../services/sfx.js";
import { getPreferences } from "../services/preferences.js";
import { resolvePlayerHudName } from "../ui/hub/playerHudIdentity.js";
import {
  getPracticeForRound,
  LESSON_COUNT,
  PRACTICE_SEGMENTS,
  TUTORIAL_FLOW,
} from "../tutorial/flow.js";
import {
  buildTutorialScripts,
  markTutorialDone,
  ScriptedZegonBrain,
} from "../tutorial/steps.js";

function duelItemLabel(item: DuelItemId): string {
  const strings = t();
  return {
    SMOKE: strings.itemSmoke,
    MIRROR: strings.itemMirror,
    PLATE: strings.itemPlate,
  }[item];
}

function actionLabel(action: PlayerAction, equippedItem?: DuelItemId): string {
  const strings = t();
  if (action === PlayerAction.USE_ITEM) {
    return equippedItem
      ? `${strings.actionUseItem} (${duelItemLabel(equippedItem)})`
      : strings.actionUseItem;
  }
  return {
    [PlayerAction.FIRE]: strings.actionFire,
    [PlayerAction.DODGE]: strings.actionDodge,
  }[action] ?? strings.actionUseItem;
}

function localeText(key: keyof LocaleStrings): string {
  return t()[key];
}

function playerFiredAction(action: string): boolean {
  return action === PlayerAction.FIRE || action === "FIRE";
}

const ITEM_SLOT_INDEX: Record<DuelItemId, number> = {
  SMOKE: 2,
  MIRROR: 3,
  PLATE: 4,
};

export class TutorialScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private tutorialBrain!: ScriptedZegonBrain;
  private combatHud!: CombatHud;
  private topHudBar!: TopHudBar;
  private spriteActionBar!: SpriteActionBar;
  private playerHandSprite!: PlayerHandSprite;
  private arenaView!: ArenaView;
  private statusLineText!: Phaser.GameObjects.Text;
  private chooseActionText!: Phaser.GameObjects.Text;
  private readingTension!: ReadingTensionLayer;
  private scanlines!: Phaser.GameObjects.Graphics;
  private readingFxPhase = 0;
  private lastShakeAt = 0;
  private modalLayer!: Phaser.GameObjects.Container;
  private gameLayer!: Phaser.GameObjects.Container;
  private segmentIndex = 0;
  private duelStarted = false;
  private waitingAdvance = false;
  private waitingInstruction = false;
  private localeUnsub: (() => void) | null = null;
  private pendingScoreSync: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("TutorialScene");
  }

  preload(): void {
    preloadLandingBackdrop(this);
    preloadPlayerHand(this);
    preloadActionAssets(this);
    preloadTopHudBar(this);
    preloadSideHudPanels(this);
    preloadResultPanelAssets(this);
    preloadTutorialPanelAssets(this);
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0, { duel: true });
    this.scanlines = drawScanlines(this, 98, 0);
    this.readingTension = new ReadingTensionLayer(this, 97);

    this.modalLayer = this.add.container(0, 0).setDepth(110);
    this.gameLayer = this.add.container(0, 0).setDepth(10);

    this.arenaView = new ArenaView(this, 5, {
      y: L.bottomStrip.arenaY,
      characterMaxH: L.bottomStrip.characterMaxH,
    });
    this.playerHandSprite = new PlayerHandSprite(this, 6);
    this.combatHud = new CombatHud(this, 9, undefined, {
      hideBlindsight: true,
      playerName: resolvePlayerHudName(t().hudGunfighter),
    });

    this.topHudBar = new TopHudBar(this, {
      onSettings: () => gameBridge.openSettingsOverlay(),
      onSurrender: () => {
        markTutorialDone();
        gameBridge.navigate({ type: "hub" });
      },
      surrenderLabel: strings.tutorialSkip,
    });

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

    this.gameLayer.add([
      this.arenaView.container,
      this.combatHud.container,
      this.statusLineText,
      this.chooseActionText,
    ]);

    this.tutorialBrain = new ScriptedZegonBrain(buildTutorialScripts(getLanguage()));
    this.adapter = new GameCoreAdapter({
      forceOffline: true,
      customBrain: this.tutorialBrain,
      onEvent: (event) => this.handleEvent(event),
    });

    const helpTexts = this.buildActionHelpTexts();
    const actionEntries: SpriteActionEntry[] = [
      { label: strings.actionFire, action: PlayerAction.FIRE, helpText: helpTexts[0] },
      { label: strings.actionDodge, action: PlayerAction.DODGE, helpText: helpTexts[1] },
      { label: strings.itemSmoke, action: PlayerAction.USE_ITEM, item: DuelItemId.SMOKE, helpText: helpTexts[2] },
      { label: strings.itemMirror, action: PlayerAction.USE_ITEM, item: DuelItemId.MIRROR, helpText: helpTexts[3] },
      { label: strings.itemPlate, action: PlayerAction.USE_ITEM, item: DuelItemId.PLATE, helpText: helpTexts[4] },
    ];
    this.spriteActionBar = new SpriteActionBar(this, {
      entries: actionEntries,
      onAction: (action, item) => {
        if (item) void this.onUseItem(item);
        else void this.onAction(action);
      },
      depth: 12,
    });

    this.localeUnsub = onLanguageChange(() => this.refreshLocale());

    this.setGameVisible(false);
    this.runCurrentSegment();
  }

  private setGameVisible(visible: boolean): void {
    this.gameLayer.setVisible(visible);
    this.spriteActionBar.setVisible(visible);
    this.playerHandSprite.setVisible(visible);
    if (!visible) {
      this.readingTension.container.setVisible(false);
      this.scanlines.setVisible(false);
    } else {
      this.readingTension.container.setVisible(true);
      this.scanlines.setVisible(true);
    }
  }

  private buildActionHelpTexts(): string[] {
    const strings = t();
    const cooldown = `\n\n${strings.itemCooldownNote.replace("{n}", String(ITEM.COOLDOWN_ROUNDS))}`;
    return [
      strings.actionDescFire,
      strings.actionDescDodge,
      `${strings.itemDescSmoke}${cooldown}`,
      `${strings.itemDescMirror}${cooldown}`,
      `${strings.itemDescPlate}${cooldown}`,
    ];
  }

  private runCurrentSegment(): void {
    const seg = TUTORIAL_FLOW[this.segmentIndex];
    if (!seg) return;

    if (seg.kind === "modal") {
      this.setGameVisible(false);
      this.showLessonModal(
        localeText(seg.titleKey as keyof LocaleStrings),
        localeText(seg.bodyKey as keyof LocaleStrings),
        seg.lesson,
        () => {
          this.segmentIndex += 1;
          this.runCurrentSegment();
        },
      );
      return;
    }

    if (seg.kind === "finish") {
      markTutorialDone();
      this.setGameVisible(false);
      this.showFinishModal(
        localeText(seg.titleKey as keyof LocaleStrings),
        localeText(seg.bodyKey as keyof LocaleStrings),
      );
      return;
    }

    if (seg.kind === "practice" && !this.duelStarted) {
      void this.beginDuel();
    }
  }

  private showLessonModal(
    title: string,
    body: string,
    lesson: number | undefined,
    onContinue: () => void,
  ): void {
    const strings = t();
    this.modalLayer.removeAll(true);
    playSfx("ui_modal_open");

    const subtitle = lesson
      ? format(strings.tutorialLessonProgress, { current: lesson, total: LESSON_COUNT })
      : undefined;

    const badge = subtitle
      ? `${strings.tutorialTip} · ${subtitle}`
      : strings.tutorialTip;

    const modal = createHubTutorialModal(this, {
      title,
      body,
      badge,
      buttonLabel: strings.tutorialOk,
      onDismiss: () => {
        playSfx("tutorial_slide_next");
        onContinue();
      },
      depth: 120,
    });
    this.modalLayer.add(modal);
  }

  private showPracticeInstruction(instruction: string, roundIndex: number): void {
    const strings = t();
    this.modalLayer.removeAll(true);
    this.waitingInstruction = true;
    playSfx("ui_modal_open");
    this.spriteActionBar.setSlotEnabledMap(false, new Set());

    const stepLabel = format(strings.tutorialStepProgress, {
      current: roundIndex + 1,
      total: PRACTICE_SEGMENTS.length,
    });

    const strip = createHubPracticeStrip(this, {
      badge: `${strings.tutorialTip} · ${stepLabel}`,
      body: instruction,
      buttonLabel: strings.tutorialOk,
      onDismiss: () => {
        playSfx("tutorial_slide_next");
        this.waitingInstruction = false;
        this.updateActionButtons(true);
      },
    });
    this.modalLayer.add(strip);
  }

  private showFinishModal(title: string, body: string): void {
    const strings = t();
    this.modalLayer.removeAll(true);
    this.setGameVisible(false);
    playSfx("tutorial_complete");

    const modal = createHubTutorialModal(this, {
      title,
      body,
      badge: strings.tutorialCompleteBadge,
      buttonLabel: strings.tutorialBackToMenu,
      onDismiss: () => gameBridge.navigate({ type: "hub" }),
      depth: 120,
    });
    this.modalLayer.add(modal);
  }

  private async beginDuel(): Promise<void> {
    const strings = t();
    this.modalLayer.removeAll(true);
    this.setGameVisible(true);
    this.duelStarted = true;
    this.waitingAdvance = false;
    this.waitingInstruction = false;
    this.statusLineText.setText(strings.tutorialPracticeTitle).setColor(COLORS.dust);
    this.chooseActionText.setText(strings.chooseAction).setAlpha(1);
    await this.adapter.initDuel("tutorial", { config: { maxRounds: PRACTICE_SEGMENTS.length } });
    playSfx("duel_start");
  }

  private syncStepUi(): void {
    if (!this.duelStarted || this.waitingAdvance) return;

    const roundIndex = this.adapter.getState().roundIndex;
    const step = getPracticeForRound(roundIndex);
    if (!step) return;

    const strings = t();
    const stepLabel = format(strings.tutorialStepProgress, {
      current: roundIndex + 1,
      total: PRACTICE_SEGMENTS.length,
    });
    this.statusLineText.setText(stepLabel).setColor(COLORS.dust);
    this.showPracticeInstruction(
      localeText(step.instructionKey as keyof LocaleStrings),
      roundIndex,
    );

    if (step.equipItem) this.adapter.setEquippedItem(step.equipItem);
    if (step.resetItemCooldown) {
      this.adapter.patchState({ itemCooldown: 0 });
    }
    if (step.forceDeadeye) {
      this.adapter.patchState({ readingStreak: 2, blindsight: 100, isDeadeye: true });
    }

    this.updateActionButtons(true);
  }

  private refreshLocale(): void {
    const strings = t();
    this.chooseActionText.setText(strings.chooseAction);
    this.spriteActionBar.refreshLabels([
      actionLabel(PlayerAction.FIRE, this.adapter?.getEquippedItem()),
      actionLabel(PlayerAction.DODGE, this.adapter?.getEquippedItem()),
      strings.itemSmoke,
      strings.itemMirror,
      strings.itemPlate,
    ]);
    this.spriteActionBar.refreshHelpTexts(this.buildActionHelpTexts());
    this.topHudBar.updateSurrenderLabel(strings.tutorialSkip);
    this.refreshPhaseStatus();
    this.updateHud();
    if (this.adapter) {
      const raw = estimateLiveScoreRaw(this.adapter.getState());
      this.combatHud.bumpLiveScore(raw, strings.score, 0);
    }
    if (this.waitingInstruction) {
      this.refreshPracticeInstruction();
    }
  }

  private refreshPhaseStatus(): void {
    if (!this.adapter || !this.duelStarted) return;
    const strings = t();
    const phase = this.adapter.getPhase();
    if (phase === DuelPhase.ZEGON_THINKING) {
      this.statusLineText.setText(strings.zegonReading).setColor(COLORS.dust);
    } else if (phase === DuelPhase.AWAITING_PLAYER) {
      const roundIndex = this.adapter.getState().roundIndex;
      const stepLabel = format(strings.tutorialStepProgress, {
        current: roundIndex + 1,
        total: PRACTICE_SEGMENTS.length,
      });
      this.statusLineText.setText(stepLabel).setColor(COLORS.dust);
    } else if (phase === DuelPhase.DEADEYE) {
      this.statusLineText.setText(strings.deadeye).setColor(COLORS.ember);
    }
  }

  private refreshPracticeInstruction(): void {
    const roundIndex = this.adapter.getState().roundIndex;
    const step = getPracticeForRound(roundIndex);
    if (!step) return;

    const strings = t();
    const stepLabel = format(strings.tutorialStepProgress, {
      current: roundIndex + 1,
      total: PRACTICE_SEGMENTS.length,
    });

    this.modalLayer.removeAll(true);
    const strip = createHubPracticeStrip(this, {
      badge: `${strings.tutorialTip} · ${stepLabel}`,
      body: localeText(step.instructionKey as keyof LocaleStrings),
      buttonLabel: strings.tutorialOk,
      onDismiss: () => {
        playSfx("tutorial_slide_next");
        this.waitingInstruction = false;
        this.updateActionButtons(true);
      },
    });
    this.modalLayer.add(strip);
  }

  private onUseItem(item: DuelItemId): void {
    if (!this.duelStarted || !this.adapter.isAwaitingPlayer() || this.waitingAdvance) return;

    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    if (!step?.allowedActions.includes(PlayerAction.USE_ITEM)) {
      this.statusLineText.setText(t().tutorialWrong).setColor(COLORS.ember);
      return;
    }
    if (step.equipItem && step.equipItem !== item) {
      this.statusLineText.setText(t().tutorialWrong).setColor(COLORS.ember);
      return;
    }

    this.adapter.setEquippedItem(item);
    if (step.resetItemCooldown) {
      this.adapter.patchState({ itemCooldown: 0 });
    }
    if (step.forceDeadeye) {
      this.adapter.patchState({ readingStreak: 2, blindsight: 100, isDeadeye: true });
    }

    this.spriteActionBar.setDimmedAll(true);
    playActionSfx(PlayerAction.USE_ITEM);
    playSfx("tutorial_correct");
    void this.adapter.submitAction(PlayerAction.USE_ITEM);
  }

  private onAction(action: PlayerAction): void {
    if (!this.duelStarted || !this.adapter.isAwaitingPlayer() || this.waitingAdvance) return;

    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    if (!step || !step.allowedActions.includes(action)) {
      this.statusLineText.setText(t().tutorialWrong).setColor(COLORS.ember);
      return;
    }

    if (step.equipItem) this.adapter.setEquippedItem(step.equipItem);
    if (step.resetItemCooldown) {
      this.adapter.patchState({ itemCooldown: 0 });
    }
    if (step.forceDeadeye) {
      this.adapter.patchState({ readingStreak: 2, blindsight: 100, isDeadeye: true });
    }

    this.spriteActionBar.setDimmedAll(true);
    playActionSfx(action);
    if (action === PlayerAction.FIRE) {
      this.playerHandSprite.playFire();
    }
    playSfx("tutorial_correct");
    void this.adapter.submitAction(action);
  }

  private handleEvent(event: DuelEvent): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        startSfxLoop("zegon_thinking", { volume: 0.28 });
        this.statusLineText.setText(strings.zegonReading).setColor(COLORS.dust);
        this.chooseActionText.setAlpha(0.35);
        this.waitingAdvance = false;
        this.spriteActionBar.setDimmedAll(false);
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        stopSfxLoop("zegon_thinking");
        playSfx("your_turn");
        this.spriteActionBar.setDimmedAll(false);
        this.statusLineText.setText(strings.lockedIn).setColor(COLORS.dust);
        this.chooseActionText.setAlpha(1);
        this.syncStepUi();
      } else if (phase === DuelPhase.DEADEYE) {
        stopSfxLoop("zegon_thinking");
        playSfx("deadeye_sting");
        this.statusLineText.setText(strings.deadeye).setColor(COLORS.ember);
        this.chooseActionText.setAlpha(0.35);
        this.cameras.main.flash(200, 255, 77, 46);
      }
    }

    if (event.type === "roundResolved" && event.outcome) {
      this.onRoundResolved(event.outcome);
    }

    if (event.type === "duelEnd") {
      this.setGameVisible(false);
      this.modalLayer.removeAll(true);
      this.waitingInstruction = false;
      this.waitingAdvance = false;

      while (
        this.segmentIndex < TUTORIAL_FLOW.length &&
        TUTORIAL_FLOW[this.segmentIndex]?.kind === "practice"
      ) {
        this.segmentIndex += 1;
      }

      markTutorialDone();
      this.time.delayedCall(650, () => this.runCurrentSegment());
      return;
    }

    this.updateHud();
    this.updateActionButtons(!this.waitingAdvance);
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    const strings = t();
    const state = this.adapter.getState();
    const playerHpNow = this.adapter.getPlayerHp();
    const zegonHpNow = this.adapter.getZegonHp();
    const prevPlayerHp = playerHpNow + outcome.playerDamage;
    const prevZegonHp = zegonHpNow + outcome.zegonDamage;

    playRoundOutcomeSfx({
      playerAction: outcome.playerAction,
      zegonMove: outcome.zegonDecision.zegonMove,
      playerDamage: outcome.playerDamage,
      zegonDamage: outcome.zegonDamage,
      blindsightDelta: outcome.blindsightDelta,
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
    } else if (playerFiredAction(outcome.playerAction) && outcome.playerDamage === 0) {
      this.playArenaFlash(C.ember, 0.38, 44);
    }

    if (outcome.zegonDecision.zegonMove === "FIRE") {
      this.time.delayedCall(120, () => {
        playZegonMoveSfx(outcome.zegonDecision.zegonMove);
        this.playFireFlash();
      });
    } else if (outcome.zegonDecision.zegonMove === "DODGE") {
      playZegonMoveSfx(outcome.zegonDecision.zegonMove);
    }

    if (outcome.deadeyeTriggered) {
      this.statusLineText.setText(strings.roundSummaryDeadeyeOn).setColor(COLORS.ember);
    } else if (outcome.predictionCorrect && outcome.playerDamage > 0) {
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummaryRead}`).setColor(COLORS.ember);
    } else if (outcome.playerDamage > 0) {
      this.statusLineText.setText(`${strings.roundSummaryYouHit} · ${strings.tutorialHpTitle}`).setColor(COLORS.ember);
    } else if (outcome.zegonDamage > 0) {
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummaryZegonHit}`).setColor(COLORS.bone);
    } else if (!outcome.predictionCorrect) {
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummarySurprised}`).setColor(COLORS.bone);
    } else {
      this.statusLineText.setText(strings.tutorialGood).setColor(COLORS.bone);
    }
    this.queueLiveScoreSync();
  }

  private queueLiveScoreSync(): void {
    this.pendingScoreSync?.remove(false);
    this.pendingScoreSync = this.time.delayedCall(140, () => {
      this.pendingScoreSync = null;
      if (!this.adapter) return;
      this.syncLiveScoreAfterRound();
    });
  }

  private syncLiveScoreAfterRound(): void {
    const state = this.adapter.getState();
    const raw = estimateLiveScoreRaw(state);
    const delta = scoreDeltaFromLastRound(state.roundLogs);
    this.combatHud.bumpLiveScore(raw, t().score, delta);
  }

  private playArenaFlash(color: number, alpha = 0.7, radius = 60): void {
    const { width } = this.scale;
    const flash = this.add
      .circle(width / 2, L.bottomStrip.arenaY + 45, radius, color, alpha)
      .setDepth(20);
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

  private triggerBlindsightSurge(delta: number): void {
    const strength = blindsightSurgeStrength(delta);
    if (strength <= 0) return;
    safeShake(this, 90 + strength * 80, 0.002 + strength * 0.003);
    this.cameras.main.flash(130, 179, 18, 43, false, undefined, 0.04 + strength * 0.06);
    this.readingFxPhase += 1.2 + strength * 1.5;
  }

  update(_time: number, delta: number): void {
    if (!this.adapter || !this.duelStarted || !this.gameLayer.visible) return;

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
  }

  private updateHud(): void {
    const strings = t();
    const state = this.adapter.getState();
    const blindsight = this.adapter.getBlindsight();
    const readingStreak = this.adapter.getReadingStreak();
    const itemCooldown = this.adapter.getItemCooldown();
    const deadeyeStreak = getEffectiveDeadeyeStreak(state.config.modifiers);

    const itemStatus = itemCooldownLabel(
      itemCooldown,
      strings.itemCooldownReady,
      (n) => strings.itemCooldownIn.replace("{n}", String(n)),
    );

    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      playerMaxHp: state.config.initialPlayerHp,
      zegonMaxHp: state.config.initialZegonHp,
      blindsight,
      readingStreak,
      deadeyeStreak,
      itemLabel: "",
      itemStatus,
      itemReady: itemCooldown <= 0,
      itemCooldown,
      playerLabel: resolvePlayerHudName(strings.hudGunfighter),
      zegonLabel: strings.hudZegon,
      hudItem: strings.hudItem,
      hudStatus: strings.hudStatus,
      blindsightLabel: `${strings.hudBlindsight}  ${readingStreak}/${deadeyeStreak}`,
      blindsightFlavor: "",
      nextMoveHint: "",
      zegonStatus: readingStreak >= deadeyeStreak - 1 ? strings.deadeyeNear : undefined,
    });

    this.topHudBar.updateStreak(strings.hudBlindsight, readingStreak, deadeyeStreak);

    this.arenaView.update(
      blindsight,
      readingStreak >= deadeyeStreak,
      this.adapter.getZegonHp(),
      state.config.initialZegonHp,
    );
  }

  private updateActionButtons(enabled: boolean): void {
    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    const allowed = new Set(step?.allowedActions ?? []);
    const adapterAvailable = new Set(this.adapter.getAvailableActions());
    const canAct =
      enabled &&
      !this.waitingInstruction &&
      this.duelStarted &&
      this.adapter.isAwaitingPlayer() &&
      allowed.size > 0;

    const enabledSlots = new Set<number>();
    if (canAct) {
      if (allowed.has(PlayerAction.FIRE) && adapterAvailable.has(PlayerAction.FIRE)) {
        enabledSlots.add(0);
      }
      if (allowed.has(PlayerAction.DODGE) && adapterAvailable.has(PlayerAction.DODGE)) {
        enabledSlots.add(1);
      }
      if (allowed.has(PlayerAction.USE_ITEM) && adapterAvailable.has(PlayerAction.USE_ITEM)) {
        if (step?.equipItem) {
          enabledSlots.add(ITEM_SLOT_INDEX[step.equipItem]);
        } else {
          enabledSlots.add(2);
          enabledSlots.add(3);
          enabledSlots.add(4);
        }
      }
    }

    this.spriteActionBar.setSlotEnabledMap(canAct, enabledSlots);
    if (!canAct) this.spriteActionBar.resetHoverAll();
  }

  shutdown(): void {
    this.localeUnsub?.();
    this.localeUnsub = null;
    stopAllSfxLoops();
    this.cameras.main.setZoom(1);
    this.topHudBar?.destroy();
    this.adapter?.destroy();
    this.combatHud?.destroy();
    this.spriteActionBar?.destroy();
    this.playerHandSprite?.destroy();
    this.arenaView?.destroy();
  }
}

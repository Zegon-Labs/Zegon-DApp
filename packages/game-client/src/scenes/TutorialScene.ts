import Phaser from "phaser";
import { format, getLanguage, onLanguageChange, t } from "../i18n/index.js";
import type { LocaleStrings } from "../i18n/index.js";
import {
  GameCoreAdapter,
  DuelPhase,
} from "../adapters/GameCoreAdapter.js";
import type { DuelEvent, RoundOutcome, DuelItemId } from "@zegon/game-core";
import { getEffectiveDeadeyeStreak, PlayerAction } from "@zegon/game-core";
import {
  drawGlitchOverlay,
  drawScanlines,
  scanlinePulseAlpha,
} from "../ui/components.js";
import {
  ActionBar,
  ArenaView,
  CombatHud,
  ItemSelector,
  itemCooldownLabel,
  itemDescription,
  createHubPracticeStrip,
  createHubTutorialModal,
  createLandingBackdrop,
  preloadLandingBackdrop,
  preloadResultPanelAssets,
  preloadSideHudPanels,
  preloadTopHudBar,
  preloadTutorialPanelAssets,
  TopHudBar,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { C, COLORS, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";
import {
  playActionSfx,
  playRoundOutcomeSfx,
  playSfx,
  startSfxLoop,
  stopAllSfxLoops,
  stopSfxLoop,
} from "../services/sfx.js";
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

export class TutorialScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private tutorialBrain!: ScriptedZegonBrain;
  private combatHud!: CombatHud;
  private topHudBar!: TopHudBar;
  private actionBar!: ActionBar;
  private itemSelector!: ItemSelector;
  private arenaView!: ArenaView;
  private statusLineText!: Phaser.GameObjects.Text;
  private chooseActionText!: Phaser.GameObjects.Text;
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private glitchPulse = 0;
  private modalLayer!: Phaser.GameObjects.Container;
  private gameLayer!: Phaser.GameObjects.Container;
  private segmentIndex = 0;
  private duelStarted = false;
  private waitingAdvance = false;
  private waitingInstruction = false;
  private localeUnsub: (() => void) | null = null;

  constructor() {
    super("TutorialScene");
  }

  preload(): void {
    preloadLandingBackdrop(this);
    preloadTopHudBar(this);
    preloadSideHudPanels(this);
    preloadResultPanelAssets(this);
    preloadTutorialPanelAssets(this);
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0);
    this.scanlines = drawScanlines(this, 98, 0.04);
    this.glitchOverlay = drawGlitchOverlay(this, 0, 97);

    this.modalLayer = this.add.container(0, 0).setDepth(110);
    this.gameLayer = this.add.container(0, 0).setDepth(10);

    this.arenaView = new ArenaView(this, 5, {
      y: L.bottomStrip.arenaY,
      characterMaxH: L.bottomStrip.characterMaxH,
    });
    this.combatHud = new CombatHud(this, 9, undefined, { hideBlindsight: true });

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

    this.actionBar = new ActionBar(
      this,
      [PlayerAction.FIRE, PlayerAction.DODGE],
      (action) => actionLabel(action, this.adapter?.getEquippedItem()),
      (action) => void this.onAction(action),
      12,
    );
    this.actionBar.addTo(this.gameLayer);

    this.itemSelector = new ItemSelector(this, {
      labelFor: duelItemLabel,
      descFor: (item) => itemDescription(item, t()),
      onUseItem: (item) => void this.onUseItem(item),
      depth: 12,
    });
    this.itemSelector.addTo(this.gameLayer);

    this.localeUnsub = onLanguageChange(() => this.refreshLocale());

    this.setGameVisible(false);
    this.runCurrentSegment();
  }

  private setGameVisible(visible: boolean): void {
    this.gameLayer.setVisible(visible);
    this.actionBar.setVisible(visible);
    if (!visible) {
      this.glitchOverlay.setVisible(false);
      this.scanlines.setVisible(false);
    } else {
      this.glitchOverlay.setVisible(true);
      this.scanlines.setVisible(true);
    }
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
    this.actionBar.setEnabledMap(false, new Set());

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
    this.actionBar.refreshLabels((action) =>
      actionLabel(action, this.adapter?.getEquippedItem()),
    );
    this.itemSelector.refreshLabels();
    this.topHudBar.updateSurrenderLabel(strings.tutorialSkip);
    this.refreshPhaseStatus();
    this.updateHud();
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

    this.actionBar.setDimmedAll(true);
    this.itemSelector.setDimmedAll(true);
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

    this.actionBar.setDimmedAll(true);
    playActionSfx(action);
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
        this.actionBar.setDimmedAll(false);
        this.itemSelector.setDimmedAll(false);
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        stopSfxLoop("zegon_thinking");
        playSfx("your_turn");
        this.itemSelector.setDimmedAll(false);
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
    playRoundOutcomeSfx({
      playerAction: outcome.playerAction,
      zegonMove: outcome.zegonDecision.zegonMove,
      playerDamage: outcome.playerDamage,
      zegonDamage: outcome.zegonDamage,
      blindsightDelta: outcome.blindsightDelta,
    });
    if (outcome.deadeyeTriggered) {
      this.statusLineText.setText(strings.roundSummaryDeadeyeOn).setColor(COLORS.ember);
    } else if (outcome.predictionCorrect && outcome.playerDamage > 0) {
      const anchor = this.combatHud.playerDamageAnchor();
      showFloatingDamage(this, anchor.x, anchor.y - 18, outcome.playerDamage, "player");
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummaryRead}`).setColor(COLORS.ember);
      this.cameras.main.flash(120, 179, 18, 43);
    } else if (outcome.playerDamage > 0) {
      const anchor = this.combatHud.playerDamageAnchor();
      showFloatingDamage(this, anchor.x, anchor.y - 18, outcome.playerDamage, "player");
      this.statusLineText.setText(`${strings.roundSummaryYouHit} · ${strings.tutorialHpTitle}`).setColor(COLORS.ember);
      this.cameras.main.flash(120, 179, 18, 43);
    } else if (outcome.zegonDamage > 0) {
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummaryZegonHit}`).setColor(COLORS.bone);
    } else if (!outcome.predictionCorrect) {
      this.statusLineText.setText(`${strings.tutorialGood} · ${strings.roundSummarySurprised}`).setColor(COLORS.bone);
    } else {
      this.statusLineText.setText(strings.tutorialGood).setColor(COLORS.bone);
    }
  }

  private updateHud(): void {
    const strings = t();
    const blindsight = this.adapter.getBlindsight();
    const readingStreak = this.adapter.getReadingStreak();
    const itemCooldown = this.adapter.getItemCooldown();
    const deadeyeStreak = getEffectiveDeadeyeStreak(this.adapter.getState().config.modifiers);

    const itemStatus = itemCooldownLabel(
      itemCooldown,
      strings.itemCooldownReady,
      (n) => strings.itemCooldownIn.replace("{n}", String(n)),
    );

    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      playerMaxHp: 100,
      zegonMaxHp: 100,
      blindsight,
      readingStreak,
      deadeyeStreak,
      itemLabel: "",
      itemStatus,
      itemReady: itemCooldown <= 0,
      itemCooldown,
      playerLabel: strings.hudYou,
      zegonLabel: strings.hudZegon,
      hudItem: strings.hudItem,
      hudStatus: strings.hudStatus,
      blindsightLabel: `${strings.hudBlindsight}  ${readingStreak}/${deadeyeStreak}`,
      blindsightFlavor: "",
      nextMoveHint: "",
      zegonStatus: readingStreak >= deadeyeStreak - 1 ? strings.deadeyeNear : undefined,
    });

    this.topHudBar.updateStreak(strings.hudBlindsight, readingStreak, deadeyeStreak);

    this.itemSelector.setCooldown(itemCooldown);
    this.itemSelector.setInteractive(this.adapter.isAwaitingPlayer() && !this.waitingAdvance);

    this.arenaView.update(blindsight, readingStreak >= deadeyeStreak);

    const intensity = blindsight / 100;
    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity, 97);
    this.glitchPulse += 0.06 + intensity * 0.14;
    this.scanlines.setAlpha(scanlinePulseAlpha(blindsight, this.glitchPulse));

    if (intensity > 0.45) {
      const flicker = 0.92 + Math.sin(this.glitchPulse) * 0.08 * intensity;
      this.glitchOverlay.setAlpha((0.35 + intensity * 0.55) * flicker);
    }
  }

  private updateActionButtons(enabled: boolean): void {
    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    const allowed = new Set(step?.allowedActions ?? []);
    const canAct =
      enabled &&
      !this.waitingInstruction &&
      this.duelStarted &&
      this.adapter.isAwaitingPlayer() &&
      allowed.size > 0;

    const actionAllowed = new Set(
      [...allowed].filter((a) => a !== PlayerAction.USE_ITEM),
    );
    this.actionBar.setEnabledMap(canAct, actionAllowed);

    const itemAllowed =
      canAct &&
      allowed.has(PlayerAction.USE_ITEM) &&
      (!step?.equipItem || step.equipItem);
    this.itemSelector.setAllowedItems(
      step?.equipItem ? new Set([step.equipItem]) : null,
    );
    this.itemSelector.setInteractive(Boolean(itemAllowed));
    if (!canAct) this.actionBar.resetHoverAll();
  }

  shutdown(): void {
    this.localeUnsub?.();
    this.localeUnsub = null;
    stopAllSfxLoops();
    this.topHudBar?.destroy();
    this.adapter?.destroy();
    this.combatHud?.destroy();
    this.actionBar?.destroy();
    this.itemSelector?.destroy();
    this.arenaView?.destroy();
  }
}

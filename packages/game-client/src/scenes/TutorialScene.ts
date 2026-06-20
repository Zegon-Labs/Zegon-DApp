import Phaser from "phaser";
import { format, getLanguage, t } from "../i18n/index.js";
import type { LocaleStrings } from "../i18n/index.js";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import type { DuelEvent, RoundOutcome } from "@zegon/game-core";
import { ALL_PLAYER_ACTIONS } from "@zegon/game-core";
import {
  drawGlitchOverlay,
  drawScanlines,
  scanlineAlphaForBlindsight,
} from "../ui/components.js";
import {
  ActionBar,
  ArenaView,
  CombatHud,
  createHubGameChrome,
  createHubPromptBar,
  createHubPracticeStrip,
  createHubTutorialModal,
  createLandingBackdrop,
  preloadLandingBackdrop,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { C, COLORS, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";
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

function actionLabel(action: PlayerAction): string {
  const strings = t();
  return {
    [PlayerAction.FIRE_HIGH]: strings.actionFireHigh,
    [PlayerAction.FIRE_LOW]: strings.actionFireLow,
    [PlayerAction.DODGE]: strings.actionDodge,
    [PlayerAction.FEINT]: strings.actionFeint,
    [PlayerAction.RELOAD]: strings.actionReload,
  }[action];
}

function localeText(key: keyof LocaleStrings): string {
  return t()[key];
}

export class TutorialScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private tutorialBrain!: ScriptedZegonBrain;
  private combatHud!: CombatHud;
  private actionBar!: ActionBar;
  private arenaView!: ArenaView;
  private promptBar!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private stepLabel!: Phaser.GameObjects.Text;
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private glitchPulse = 0;
  private modalLayer!: Phaser.GameObjects.Container;
  private gameLayer!: Phaser.GameObjects.Container;
  private segmentIndex = 0;
  private duelStarted = false;
  private waitingAdvance = false;
  private waitingInstruction = false;

  constructor() {
    super("TutorialScene");
  }

  preload(): void {
    preloadLandingBackdrop(this);
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

    this.arenaView = new ArenaView(this, 5);
    this.combatHud = new CombatHud(this, 9);
    const prompt = createHubPromptBar(this, 10);
    this.promptBar = prompt.container;
    this.statusText = prompt.text;

    this.stepLabel = this.add.text(width / 2, L.topBar.y, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "21px",
      color: COLORS.ember,
      letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(11);

    this.gameLayer.add([
      this.arenaView.container,
      this.combatHud.container,
      this.promptBar,
      this.stepLabel,
    ]);

    this.tutorialBrain = new ScriptedZegonBrain(buildTutorialScripts(getLanguage()));
    this.adapter = new GameCoreAdapter({
      forceOffline: true,
      customBrain: this.tutorialBrain,
      onEvent: (event) => this.handleEvent(event),
    });

    this.actionBar = new ActionBar(
      this,
      [...ALL_PLAYER_ACTIONS],
      actionLabel,
      (action) => void this.onAction(action),
      12,
    );
    this.actionBar.addTo(this.gameLayer);

    this.setGameVisible(false);
    this.runCurrentSegment();

    createHubGameChrome(this, {
      skip: {
        label: strings.tutorialSkip,
        onClick: () => {
          markTutorialDone();
          gameBridge.navigate({ type: "hub" });
        },
      },
      settings: {
        label: strings.settings,
        onClick: () => gameBridge.openSettingsOverlay(),
      },
    });
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
      onDismiss: onContinue,
      depth: 120,
    });
    this.modalLayer.add(modal);
  }

  private showPracticeInstruction(instruction: string, roundIndex: number): void {
    const strings = t();
    this.modalLayer.removeAll(true);
    this.waitingInstruction = true;
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
    this.modalLayer.removeAll(true);
    this.setGameVisible(true);
    this.duelStarted = true;
    this.waitingAdvance = false;
    this.waitingInstruction = false;
    this.statusText.setText(t().tutorialPracticeTitle).setColor(COLORS.bone);
    await this.adapter.initDuel("tutorial", { config: { maxRounds: PRACTICE_SEGMENTS.length } });
  }

  private syncStepUi(): void {
    if (!this.duelStarted || this.waitingAdvance) return;

    const roundIndex = this.adapter.getState().roundIndex;
    const step = getPracticeForRound(roundIndex);
    if (!step) return;

    const strings = t();
    this.stepLabel.setText(
      format(strings.tutorialStepProgress, {
        current: roundIndex + 1,
        total: PRACTICE_SEGMENTS.length,
      }),
    );
    this.showPracticeInstruction(
      localeText(step.instructionKey as keyof LocaleStrings),
      roundIndex,
    );

    if (step.forceAmmoZero) this.adapter.patchState({ ammo: 0 });
    if (step.forceDeadeye) this.adapter.patchState({ blindsight: 100, isDeadeye: true });

    this.updateActionButtons(true);
  }

  private onAction(action: PlayerAction): void {
    if (!this.duelStarted || !this.adapter.isAwaitingPlayer() || this.waitingAdvance) return;

    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    if (!step || !step.allowedActions.includes(action)) {
      this.statusText.setText(t().tutorialWrong).setColor(COLORS.ember);
      return;
    }

    if (step.forceAmmoZero) this.adapter.patchState({ ammo: 0 });
    if (step.forceDeadeye) this.adapter.patchState({ blindsight: 100, isDeadeye: true });

    this.actionBar.setDimmedAll(true);
    void this.adapter.submitAction(action);
  }

  private handleEvent(event: DuelEvent): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText(strings.zegonReading).setColor(COLORS.ember);
        this.waitingAdvance = false;
        this.actionBar.setDimmedAll(false);
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText(strings.yourMove).setColor(COLORS.bone);
        this.syncStepUi();
      } else if (phase === DuelPhase.DEADEYE) {
        this.statusText.setText(strings.deadeye).setColor(COLORS.ember);
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
        TUTORIAL_FLOW[this.segmentIndex]?.kind !== "finish"
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
    if (outcome.deadeyeTriggered) {
      this.statusText.setText(strings.roundSummaryDeadeyeOn).setColor(COLORS.ember);
    } else if (outcome.predictionCorrect) {
      this.statusText.setText(
        `${strings.tutorialGood} · ${strings.roundSummaryRead} (+15 ${strings.hudBlindsight})`,
      ).setColor(COLORS.ember);
    } else if (outcome.playerDamage > 0) {
      const anchor = this.combatHud.playerDamageAnchor();
      showFloatingDamage(this, anchor.x, anchor.y - 18, outcome.playerDamage, "player");
      this.statusText.setText(`${strings.roundSummaryYouHit} · ${strings.tutorialHpTitle}`).setColor(COLORS.ember);
      this.cameras.main.flash(120, 179, 18, 43);
    } else if (outcome.zegonDamage > 0) {
      this.statusText.setText(`${strings.tutorialGood} · ${strings.roundSummaryZegonHit}`).setColor(COLORS.bone);
    } else if (outcome.blindsightDelta < 0) {
      this.statusText.setText(`${strings.tutorialGood} · ${strings.roundSummarySurprised}`).setColor(COLORS.bone);
    } else {
      this.statusText.setText(strings.tutorialGood).setColor(COLORS.bone);
    }
  }

  private updateHud(): void {
    const strings = t();
    const blindsight = this.adapter.getBlindsight();

    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      ammo: this.adapter.getAmmo(),
      blindsight,
      playerLabel: strings.hudYou,
      zegonLabel: strings.hudZegon,
      ammoLabel: strings.hudAmmo,
      blindsightLabel: `${strings.hudBlindsight}  ${blindsight}%`,
      zegonDetail: blindsight >= 80 ? strings.deadeyeNear : undefined,
    });

    this.arenaView.update(blindsight, blindsight >= 100);

    const intensity = blindsight / 100;
    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity, 97);
    this.scanlines.setAlpha(scanlineAlphaForBlindsight(blindsight));

    if (intensity > 0.45) {
      this.glitchPulse += 0.08 + intensity * 0.12;
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

    this.actionBar.setEnabledMap(canAct, allowed);
    if (!canAct) this.actionBar.resetHoverAll();
  }

  shutdown(): void {
    this.adapter?.destroy();
    this.combatHud?.destroy();
    this.actionBar?.destroy();
    this.arenaView?.destroy();
  }
}

import Phaser from "phaser";
import { format, getLanguage, t } from "../i18n/index.js";
import type { LocaleStrings } from "../i18n/index.js";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import type { DuelEvent, RoundOutcome } from "@zegon/game-core";
import {
  createActionButton,
  createPromptPanel,
  createSmallButton,
  createTutorialBubble,
  type ActionButtonHandle,
  drawBlindsightMeter,
  drawDesertBackdrop,
  drawDivider,
  drawGlitchOverlay,
  drawHpBar,
  drawScanlines,
  scanlineAlphaForBlindsight,
  drawZegonFigure,
} from "../ui/components.js";
import { actionButtonWidth, DUEL_LAYOUT as L, TUTORIAL_BUBBLE } from "../ui/layout.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { C, COLORS, FONT } from "../ui/theme.js";
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
  private gameUi: Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible> = [];
  private modalLayer!: Phaser.GameObjects.Container;
  private zegonFigure!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Container;
  private blindsightGfx!: Phaser.GameObjects.Graphics;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private stepLabel!: Phaser.GameObjects.Text;
  private hudHintText!: Phaser.GameObjects.Text;
  private playerHudText!: Phaser.GameObjects.Text;
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private glitchPulse = 0;
  private actionButtons: ActionButtonHandle[] = [];
  private segmentIndex = 0;
  private duelStarted = false;
  private waitingAdvance = false;
  private waitingInstruction = false;

  constructor() {
    super("TutorialScene");
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    this.scanlines = drawScanlines(this);
    this.glitchOverlay = drawGlitchOverlay(this, 0);

    this.modalLayer = this.add.container(0, 0).setDepth(110);

    this.backdrop = drawDesertBackdrop(this, 0);
    this.track(this.backdrop);
    drawDivider(this, L.divider.y);

    this.zegonFigure = drawZegonFigure(this, width / 2, L.arena.y, 0);
    this.track(this.zegonFigure);

    this.blindsightGfx = this.add.graphics().setDepth(8);
    this.hpGfx = this.add.graphics().setDepth(8);
    this.track(this.blindsightGfx, this.hpGfx);

    const blindsightLabel = this.add.text(L.blindsight.labelX, L.blindsight.labelY, strings.hudBlindsight, {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.ember,
    }).setOrigin(1, 0).setDepth(8);
    this.track(blindsightLabel);

    const promptX = (width - L.prompt.w) / 2;
    const prompt = createPromptPanel(this, promptX, L.prompt.y, L.prompt.w, L.prompt.h, 8);
    this.statusText = prompt.text;
    this.track(prompt.container);

    this.stepLabel = this.add.text(20, L.topBar.y, "", {
      fontFamily: FONT,
      fontSize: "15px",
      color: COLORS.cyan,
    }).setDepth(9);
    this.track(this.stepLabel);

    this.playerHudText = this.add.text(20, L.stats.y, "", {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.bone,
    }).setDepth(9);
    this.track(this.playerHudText);

    this.hudHintText = this.add.text(width / 2, L.stats.y - 14, strings.tutorialHudHint, {
      fontFamily: FONT,
      fontSize: "11px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5, 0).setDepth(9);
    this.track(this.hudHintText);

    this.tutorialBrain = new ScriptedZegonBrain(buildTutorialScripts(getLanguage()));
    this.adapter = new GameCoreAdapter({
      forceOffline: true,
      customBrain: this.tutorialBrain,
      onEvent: (event) => this.handleEvent(event),
    });

    this.createActionButtons();
    this.setGameVisible(false);
    this.runCurrentSegment();

    createSmallButton(this, width - 12, 10, strings.tutorialSkip, () => {
      markTutorialDone();
      gameBridge.navigate({ type: "hub" });
    }).setDepth(60);
  }

  private track(...objects: Array<Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible>): void {
    this.gameUi.push(...objects);
  }

  private setGameVisible(visible: boolean): void {
    for (const obj of this.gameUi) {
      obj.setVisible(visible);
    }
    for (const btn of this.actionButtons) {
      btn.container.setVisible(visible);
    }
    if (!visible) {
      this.resetPresentationEffects();
    } else {
      this.glitchOverlay.setVisible(true);
      this.scanlines.setVisible(true);
    }
  }

  /** Hide glitch/scanlines so tutorial modals stay on top and readable. */
  private resetPresentationEffects(): void {
    this.glitchOverlay.setVisible(false);
    this.scanlines.setVisible(false);
  }

  private createActionButtons(): void {
    const actions = Object.values(PlayerAction);
    const { width } = this.scale;
    const btnW = actionButtonWidth(width, actions.length, L.actions.gap);
    const y = L.actions.y;
    const total = actions.length * btnW + (actions.length - 1) * L.actions.gap;
    let x = (width - total) / 2 + btnW / 2;

    actions.forEach((action) => {
      const btn = createActionButton(
        this, x, y, btnW, L.actions.h, actionLabel(action),
        () => void this.onAction(action),
        8,
      );
      this.actionButtons.push(btn);
      x += btnW + L.actions.gap;
    });
    this.updateActionButtons(false);
  }

  private runCurrentSegment(): void {
    const seg = TUTORIAL_FLOW[this.segmentIndex];
    if (!seg) return;

    if (seg.kind === "modal") {
      this.setGameVisible(false);
      this.resetPresentationEffects();
      this.showModal(
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
      this.resetPresentationEffects();
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

  private showModal(
    title: string,
    body: string,
    lesson: number | undefined,
    onContinue: () => void,
  ): void {
    const strings = t();
    const { width, height } = this.scale;
    this.modalLayer.removeAll(true);
    this.resetPresentationEffects();

    const dim = this.add
      .rectangle(width / 2, height / 2, width, height, C.void, 0.88)
      .setDepth(109);
    this.modalLayer.add(dim);

    const subtitle = lesson
      ? format(strings.tutorialLessonProgress, { current: lesson, total: LESSON_COUNT })
      : undefined;

    const badge = subtitle
      ? `▸ ${strings.tutorialTip} · ${subtitle}`
      : `▸ ${strings.tutorialTip}`;

    const centered = lesson === undefined;

    const bubble = createTutorialBubble(this, {
      title,
      body,
      badge,
      buttonLabel: strings.tutorialOk,
      onDismiss: onContinue,
      x: centered ? width / 2 : TUTORIAL_BUBBLE.lesson.x,
      y: centered ? height / 2 - 8 : TUTORIAL_BUBBLE.lesson.y,
      entrance: centered ? "fade" : "slide",
      depth: 110,
    });
    this.modalLayer.add(bubble);
  }

  private showPracticeInstructionPopup(instruction: string, roundIndex: number): void {
    const strings = t();
    this.modalLayer.removeAll(true);
    this.waitingInstruction = true;
    this.updateActionButtons(false);

    const stepLabel = format(strings.tutorialStepProgress, {
      current: roundIndex + 1,
      total: PRACTICE_SEGMENTS.length,
    });

    const bubble = createTutorialBubble(this, {
      body: instruction,
      badge: `▸ ${strings.tutorialTip} · ${stepLabel}`,
      buttonLabel: strings.tutorialOk,
      onDismiss: () => {
        this.waitingInstruction = false;
        this.updateActionButtons(true);
      },
      x: TUTORIAL_BUBBLE.practice.x,
      y: TUTORIAL_BUBBLE.practice.y,
      depth: 50,
    });
    this.modalLayer.add(bubble);
  }

  private setPracticeFeedback(text: string, color: string = COLORS.bone): void {
    this.statusText.setText(text).setColor(color);
  }

  private showFinishModal(title: string, body: string): void {
    const strings = t();
    const { width, height } = this.scale;
    this.modalLayer.removeAll(true);
    this.resetPresentationEffects();

    const dim = this.add
      .rectangle(width / 2, height / 2, width, height, C.void, 0.88)
      .setDepth(109);
    this.modalLayer.add(dim);

    const bubble = createTutorialBubble(this, {
      title,
      body,
      badge: `▸ ${strings.tutorialTip}`,
      buttonLabel: strings.tutorialBackToMenu,
      onDismiss: () => gameBridge.navigate({ type: "hub" }),
      x: width / 2,
      y: height / 2 - 8,
      entrance: "fade",
      depth: 110,
    });
    this.modalLayer.add(bubble);
  }

  private async beginDuel(): Promise<void> {
    this.modalLayer.removeAll(true);
    this.setGameVisible(true);
    this.hudHintText.setVisible(false);
    this.duelStarted = true;
    this.waitingAdvance = false;
    this.waitingInstruction = false;
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
    this.showPracticeInstructionPopup(
      localeText(step.instructionKey as keyof LocaleStrings),
      roundIndex,
    );

    if (step.forceAmmoZero) {
      this.adapter.patchState({ ammo: 0 });
    }
    if (step.forceDeadeye) {
      this.adapter.patchState({ blindsight: 100, isDeadeye: true });
    }

    this.updateActionButtons(true);
  }

  private onAction(action: PlayerAction): void {
    if (!this.duelStarted || !this.adapter.isAwaitingPlayer() || this.waitingAdvance) return;

    const step = getPracticeForRound(this.adapter.getState().roundIndex);
    if (!step || !step.allowedActions.includes(action)) {
      this.setPracticeFeedback(t().tutorialWrong, COLORS.ember);
      return;
    }

    if (step.forceAmmoZero) {
      this.adapter.patchState({ ammo: 0 });
    }
    if (step.forceDeadeye) {
      this.adapter.patchState({ blindsight: 100, isDeadeye: true });
    }
    this.actionButtons.forEach((btn) => {
      btn.resetHover();
      btn.setDimmed(true);
    });
    void this.adapter.submitAction(action);
  }

  private handleEvent(event: DuelEvent): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText(strings.zegonReading).setColor(COLORS.ember);
        this.waitingAdvance = false;
        this.actionButtons.forEach((btn) => btn.setDimmed(false));
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText(strings.yourMove).setColor(COLORS.cyan);
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
      this.resetPresentationEffects();
      while (
        this.segmentIndex < TUTORIAL_FLOW.length &&
        TUTORIAL_FLOW[this.segmentIndex]?.kind === "practice"
      ) {
        this.segmentIndex += 1;
      }
      this.time.delayedCall(500, () => this.runCurrentSegment());
      return;
    }

    this.updateHud();
    this.updateActionButtons(!this.waitingAdvance);
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    const strings = t();
    if (outcome.deadeyeTriggered) {
      this.setPracticeFeedback(strings.roundSummaryDeadeyeOn, COLORS.ember);
    } else if (outcome.predictionCorrect) {
      this.setPracticeFeedback(
        `${strings.tutorialGood} — ${strings.roundSummaryRead} (+15 ${strings.hudBlindsight})`,
        COLORS.ember,
      );
    } else if (outcome.playerDamage > 0) {
      showFloatingDamage(this, 80, L.stats.hpBarY - 20, outcome.playerDamage, "player");
      this.setPracticeFeedback(
        `${strings.roundSummaryYouHit} — ${strings.tutorialHpTitle}`,
        COLORS.ember,
      );
      this.cameras.main.flash(120, 179, 18, 43);
    } else if (outcome.zegonDamage > 0) {
      this.setPracticeFeedback(
        `${strings.tutorialGood} — ${strings.roundSummaryZegonHit}`,
        COLORS.cyan,
      );
    } else if (outcome.blindsightDelta < 0) {
      this.setPracticeFeedback(
        `${strings.tutorialGood} — ${strings.roundSummarySurprised}`,
        COLORS.cyan,
      );
    } else {
      this.setPracticeFeedback(strings.tutorialGood, COLORS.cyan);
    }
  }

  private updateHud(): void {
    const { width } = this.scale;
    const strings = t();
    const blindsight = this.adapter.getBlindsight();
    const playerHp = this.adapter.getPlayerHp();
    const zegonHp = this.adapter.getZegonHp();
    const ammo = this.adapter.getAmmo();

    drawBlindsightMeter(
      this.blindsightGfx,
      L.blindsight.barX,
      L.blindsight.barY,
      L.blindsight.barW,
      L.blindsight.barH,
      blindsight,
    );
    this.hpGfx.clear();
    drawHpBar(
      this.hpGfx, 20, L.stats.hpBarY, L.stats.hpBarW, L.stats.hpBarH,
      playerHp, 100, C.cyan,
    );
    drawHpBar(
      this.hpGfx, width - 20 - L.stats.hpBarW, L.stats.hpBarY,
      L.stats.hpBarW, L.stats.hpBarH, zegonHp, 100, C.ember,
    );

    this.playerHudText.setText(
      `${strings.hudYou} ${playerHp}${strings.hudHp} · ${strings.hudAmmo} ×${ammo}  |  ${strings.hudZegon} ${zegonHp}${strings.hudHp}`,
    );

    this.zegonFigure.destroy();
    this.zegonFigure = drawZegonFigure(
      this, width / 2, L.arena.y, blindsight, blindsight >= 80,
    );
    this.track(this.zegonFigure);

    this.backdrop.destroy();
    this.backdrop = drawDesertBackdrop(this, blindsight / 100);
    this.track(this.backdrop);

    const intensity = blindsight / 100;
    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity);
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

    this.actionButtons.forEach((btn, i) => {
      const action = Object.values(PlayerAction)[i]!;
      const active = canAct && allowed.has(action);
      btn.setEnabled(active);
      btn.resetHover();
    });
  }

  shutdown(): void {
    this.adapter?.destroy();
  }
}

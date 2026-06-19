import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import { shouldUseServerApi, apiBaseUrl } from "../services/apiMode.js";
import { gameBridge } from "../game/bridge.js";
import { t } from "../i18n/index.js";
import type { DuelEvent, RoundOutcome } from "@zegon/game-core";
import { ActionValidationError } from "@zegon/game-core";
import {
  createActionButton,
  createLabeledPanel,
  createPromptPanel,
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
import { actionButtonWidth, DUEL_LAYOUT as L } from "../ui/layout.js";
import { buildRoundSummary } from "../ui/roundSummary.js";
import { C, COLORS, FONT } from "../ui/theme.js";

function actionLabel(action: PlayerAction | string): string {
  const strings = t();
  const map: Record<string, string> = {
    [PlayerAction.FIRE_HIGH]: strings.actionFireHigh,
    [PlayerAction.FIRE_LOW]: strings.actionFireLow,
    [PlayerAction.DODGE]: strings.actionDodge,
    [PlayerAction.FEINT]: strings.actionFeint,
    [PlayerAction.RELOAD]: strings.actionReload,
  };
  return map[action] ?? action;
}

function actionDescription(action: PlayerAction): string {
  const strings = t();
  return {
    [PlayerAction.FIRE_HIGH]: strings.actionDescFireHigh,
    [PlayerAction.FIRE_LOW]: strings.actionDescFireLow,
    [PlayerAction.DODGE]: strings.actionDescDodge,
    [PlayerAction.FEINT]: strings.actionDescFeint,
    [PlayerAction.RELOAD]: strings.actionDescReload,
  }[action];
}

function isFireAction(action: PlayerAction): boolean {
  return action === PlayerAction.FIRE_HIGH || action === PlayerAction.FIRE_LOW;
}

function formatSubmitError(err: unknown): string {
  const strings = t();
  if (err instanceof ActionValidationError && err.message.includes("ammo")) {
    return strings.errorNoAmmo;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export class DuelScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private backdrop!: Phaser.GameObjects.Container;
  private zegonFigure!: Phaser.GameObjects.Container;
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private glitchPulse = 0;
  private roundText!: Phaser.GameObjects.Text;
  private historyBody!: Phaser.GameObjects.Text;
  private blindsightLabel!: Phaser.GameObjects.Text;
  private blindsightGfx!: Phaser.GameObjects.Graphics;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private playerStats!: Phaser.GameObjects.Text;
  private zegonStats!: Phaser.GameObjects.Text;
  private promptPanel!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private tauntText!: Phaser.GameObjects.Text;
  private roundResultText!: Phaser.GameObjects.Text;
  private roundResultPanel!: Phaser.GameObjects.Rectangle;
  private actionTooltipText!: Phaser.GameObjects.Text;
  private actionButtons: ActionButtonHandle[] = [];
  private mode: "standard" | "daily" = "standard";
  private showingRoundResult = false;

  constructor() {
    super("DuelScene");
  }

  init(data: { mode?: "standard" | "daily" }): void {
    this.mode = data.mode ?? "standard";
    this.showingRoundResult = false;
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    this.backdrop = drawDesertBackdrop(this, 0);
    this.scanlines = drawScanlines(this);
    this.glitchOverlay = drawGlitchOverlay(this, 0);
    drawDivider(this, L.divider.y);

    this.zegonFigure = drawZegonFigure(this, width / 2, L.arena.y, 0);

    this.roundText = this.add.text(20, L.topBar.y, "", {
      fontFamily: FONT,
      fontSize: "18px",
      color: COLORS.ember,
    }).setDepth(10);

    const historyPanel = createLabeledPanel(
      this, L.history.x, L.history.y, L.history.w, L.history.h, strings.history, 10,
    );
    this.historyBody = historyPanel.body;

    this.blindsightLabel = this.add.text(L.blindsight.labelX, L.blindsight.labelY, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.ember,
    }).setOrigin(1, 0).setDepth(10);

    this.blindsightGfx = this.add.graphics().setDepth(10);
    this.hpGfx = this.add.graphics().setDepth(10);

    this.playerStats = this.add.text(20, L.stats.y, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.bone,
    }).setDepth(10);

    this.zegonStats = this.add.text(width - 20, L.stats.y, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.ember,
    }).setOrigin(1, 0).setDepth(10);

    const promptX = (width - L.prompt.w) / 2;
    const prompt = createPromptPanel(this, promptX, L.prompt.y, L.prompt.w, L.prompt.h, 10);
    this.promptPanel = prompt.container;
    this.statusText = prompt.text;

    this.tauntText = this.add.text(width / 2, L.taunt.y, "", {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: L.taunt.maxW },
    }).setOrigin(0.5, 0).setDepth(10);

    this.roundResultPanel = this.add.rectangle(
      width / 2,
      L.roundResult.y,
      L.roundResult.w,
      L.roundResult.h,
      C.ash,
      0.92,
    ).setStrokeStyle(1, C.fog).setDepth(11).setVisible(false);

    this.roundResultText = this.add.text(width / 2, L.roundResult.y, "", {
      fontFamily: FONT,
      fontSize: "17px",
      color: COLORS.bone,
      align: "center",
      wordWrap: { width: L.roundResult.w - 24 },
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(12).setVisible(false);

    this.actionTooltipText = this.add.text(width / 2, L.tooltip.y, strings.actionTooltipHint, {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5).setDepth(11);

    this.adapter = new GameCoreAdapter({
      brainMode: shouldUseServerApi() ? "api" : "dummy",
      apiBaseUrl: apiBaseUrl(),
      onEvent: (event) => this.handleEvent(event),
    });

    this.createActionButtons();
    void this.adapter.initDuel(this.mode);
    this.updateHud();
  }

  private createActionButtons(): void {
    const actions = Object.values(PlayerAction);
    const { width } = this.scale;
    const btnW = actionButtonWidth(width, actions.length, L.actions.gap);
    const btnH = L.actions.h;
    const y = L.actions.y;
    const total = actions.length * btnW + (actions.length - 1) * L.actions.gap;
    let x = (width - total) / 2 + btnW / 2;

    actions.forEach((action) => {
      const btn = createActionButton(
        this, x, y, btnW, btnH, actionLabel(action),
        () => {
          if (!this.adapter.isAwaitingPlayer()) return;
          if (!this.adapter.getAvailableActions().includes(action)) return;
          void this.submitPlayerAction(action);
        },
        10,
        (hovering) => this.showActionTooltip(action, hovering),
      );
      this.actionButtons.push(btn);
      x += btnW + L.actions.gap;
    });
  }

  private showActionTooltip(action: PlayerAction, visible: boolean): void {
    const strings = t();
    if (visible) {
      this.actionTooltipText
        .setText(`${actionLabel(action)} — ${actionDescription(action)}`)
        .setColor(COLORS.cyan);
    } else {
      this.actionTooltipText
        .setText(strings.actionTooltipHint)
        .setColor(COLORS.dust);
    }
  }

  private setPromptVisible(visible: boolean): void {
    this.promptPanel.setVisible(visible);
    this.tauntText.setVisible(visible && !this.showingRoundResult);
  }

  private setTauntVisible(visible: boolean): void {
    this.tauntText.setVisible(visible && !this.showingRoundResult);
  }

  private showRoundResult(outcome: RoundOutcome): void {
    const summary = buildRoundSummary(outcome, t(), (action) =>
      actionLabel(action),
    );
    this.showingRoundResult = true;
    this.setPromptVisible(false);
    this.setTauntVisible(false);
    this.roundResultText.setText(summary.text).setColor(summary.color);
    this.roundResultPanel.setVisible(true);
    this.roundResultText.setVisible(true);

    this.tweens.add({
      targets: [this.roundResultText, this.roundResultPanel],
      alpha: { from: 0.4, to: 1 },
      duration: 200,
      ease: "Sine.Out",
    });

    this.time.delayedCall(2200, () => {
      this.showingRoundResult = false;
      this.roundResultPanel.setVisible(false);
      this.roundResultText.setVisible(false);
      this.setPromptVisible(true);
      this.setTauntVisible(true);
    });
  }

  private playFireFlash(): void {
    const { width } = this.scale;
    const flash = this.add.circle(width / 2, L.arena.y + 30, 40, C.ember, 0.7).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 280,
      onComplete: () => flash.destroy(),
    });
    this.cameras.main.shake(100, 0.003);
    if (this.sound.get("fire")) {
      this.sound.play("fire", { volume: 0.4 });
    }
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    this.showRoundResult(outcome);
    if (outcome.playerDamage > 0) {
      this.cameras.main.flash(180, 179, 18, 43);
      this.cameras.main.shake(150, 0.005);
    }
    if (
      outcome.zegonDecision.zegonMove === "FIRE_HIGH" ||
      outcome.zegonDecision.zegonMove === "FIRE_LOW"
    ) {
      this.time.delayedCall(120, () => this.playFireFlash());
    }
  }

  private handleEvent(event: DuelEvent): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText(strings.zegonReading).setColor(COLORS.ember);
        this.tauntText.setText("");
        if (!this.showingRoundResult) {
          this.roundResultPanel.setVisible(false);
          this.roundResultText.setVisible(false);
        }
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText(strings.yourTurnPrompt).setColor(COLORS.cyan);
        this.tauntText.setText(this.adapter.getPendingTaunt() ?? "");
      } else if (phase === DuelPhase.DEADEYE) {
        this.statusText.setText(strings.deadeye).setColor(COLORS.ember);
        this.cameras.main.flash(280, 255, 77, 46);
        this.cameras.main.shake(200, 0.008);
      }
    }

    if (event.type === "roundResolved" && event.outcome) {
      this.onRoundResolved(event.outcome);
    }

    if (event.type === "duelEnd") {
      this.time.delayedCall(800, () => {
        gameBridge.navigate({
          type: "result",
          result: this.adapter.getResult(),
          duelId: this.adapter.getDuelId(),
          apiBaseUrl: this.adapter.getApiBaseUrl(),
          mode: this.mode,
        });
      });
    }

    this.updateHud();
    this.updateActionButtons();
    this.updateArena();
  }

  private updateArena(): void {
    const blindsight = this.adapter.getBlindsight();
    const isDeadeye = blindsight >= 80;
    const intensity = blindsight / 100;

    this.zegonFigure.destroy();
    this.zegonFigure = drawZegonFigure(this, this.scale.width / 2, L.arena.y, blindsight, isDeadeye);

    this.backdrop.destroy();
    this.backdrop = drawDesertBackdrop(this, intensity);
    this.backdrop.setDepth(0);

    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity);
    this.scanlines.setAlpha(scanlineAlphaForBlindsight(blindsight));

    if (intensity > 0.45) {
      this.glitchPulse += 0.08 + intensity * 0.12;
      const flicker = 0.92 + Math.sin(this.glitchPulse) * 0.08 * intensity;
      this.glitchOverlay.setAlpha((0.35 + intensity * 0.55) * flicker);
    }

    if (intensity > 0.65) {
      this.cameras.main.setZoom(1 + (intensity - 0.65) * 0.04);
      if (Math.random() < intensity * 0.04) {
        this.cameras.main.shake(60, 0.002 * intensity);
      }
    } else {
      this.cameras.main.setZoom(1);
    }
  }

  private updateHud(): void {
    const strings = t();
    const { width } = this.scale;
    const state = this.adapter.getState();
    const history = state.playerHistory;
    const blindsight = this.adapter.getBlindsight();
    const playerHp = this.adapter.getPlayerHp();
    const zegonHp = this.adapter.getZegonHp();

    this.roundText.setText(`${strings.round} ${String(state.roundIndex + 1).padStart(2, "0")}`);

    const lines = history.slice(-5).map((action, i) => {
      const r = history.length - history.slice(-5).length + i + 1;
      return `${strings.round} ${String(r).padStart(2, "0")} · ${actionLabel(action as PlayerAction)}`;
    });
    this.historyBody.setText(lines.length > 0 ? lines.join("\n") : "—");

    this.blindsightLabel.setText(`${strings.hudBlindsight}  ${blindsight}%`);
    drawBlindsightMeter(
      this.blindsightGfx,
      L.blindsight.barX,
      L.blindsight.barY,
      L.blindsight.barW,
      L.blindsight.barH,
      blindsight,
    );

    drawHpBar(
      this.hpGfx, 20, L.stats.hpBarY, L.stats.hpBarW, L.stats.hpBarH,
      playerHp, 100, C.cyan,
    );
    drawHpBar(
      this.hpGfx, width - 20 - L.stats.hpBarW, L.stats.hpBarY,
      L.stats.hpBarW, L.stats.hpBarH, zegonHp, 100, C.ember,
    );

    this.playerStats.setText(
      `${strings.hudYou}  ${playerHp}${strings.hudHp}  ·  ${strings.hudAmmo} ×${this.adapter.getAmmo()}`,
    );

    const deadeyeNear = blindsight >= 80;
    this.zegonStats.setText(
      `${strings.hudZegon}  ${zegonHp}${strings.hudHp}` +
      (deadeyeNear ? `\n${strings.deadeyeNear}` : ""),
    );
  }

  private updateActionButtons(): void {
    const available = new Set(this.adapter.getAvailableActions());
    const enabled = this.adapter.isAwaitingPlayer();

    this.actionButtons.forEach((btn, i) => {
      const action = Object.values(PlayerAction)[i]!;
      const active = enabled && available.has(action);
      btn.setLabel(actionLabel(action));
      btn.setEnabled(active);
      btn.resetHover();
    });
  }

  private async submitPlayerAction(action: PlayerAction): Promise<void> {
    this.actionButtons.forEach((btn) => {
      btn.resetHover();
      btn.setDimmed(true);
    });
    this.actionTooltipText.setText("").setAlpha(0.35);
    try {
      await this.adapter.submitAction(action);
      if (isFireAction(action)) this.playFireFlash();
    } catch (err) {
      this.statusText.setText(formatSubmitError(err)).setColor(COLORS.ember);
    } finally {
      this.actionTooltipText.setText(t().actionTooltipHint).setAlpha(1);
      this.actionButtons.forEach((btn) => btn.setDimmed(false));
      this.updateActionButtons();
    }
  }

  shutdown(): void {
    this.adapter?.destroy();
  }
}

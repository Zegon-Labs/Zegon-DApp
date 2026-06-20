import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import { shouldUseServerApi, apiBaseUrl } from "../services/apiMode.js";
import { t, getLanguage } from "../i18n/index.js";
import type { DuelEvent, RoundOutcome, ZegonArchetypeId } from "@zegon/game-core";
import { ActionValidationError, ALL_PLAYER_ACTIONS, getArchetype, getDailyArchetype } from "@zegon/game-core";
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
  createHubConfirmModal,
  createHubPromptBar,
  createLandingBackdrop,
  DuelHistoryLog,
  preloadLandingBackdrop,
} from "../ui/hub/index.js";
import { DUEL_LAYOUT as L } from "../ui/layout.js";
import { buildRoundSummary } from "../ui/roundSummary.js";
import { showFloatingDamage } from "../ui/floatingDamage.js";
import { C, COLORS, FONT, FONT_DISPLAY } from "../ui/theme.js";
import { gameBridge } from "../game/bridge.js";

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
  private arenaView!: ArenaView;
  private combatHud!: CombatHud;
  private actionBar!: ActionBar;
  private glitchOverlay!: Phaser.GameObjects.Container;
  private scanlines!: Phaser.GameObjects.Graphics;
  private glitchPulse = 0;
  private roundText!: Phaser.GameObjects.Text;
  private historyLog!: DuelHistoryLog;
  private statusText!: Phaser.GameObjects.Text;
  private promptBar!: Phaser.GameObjects.Container;
  private tauntText!: Phaser.GameObjects.Text;
  private roundResultText!: Phaser.GameObjects.Text;
  private roundResultPanel!: Phaser.GameObjects.Rectangle;
  private actionTooltipText!: Phaser.GameObjects.Text;
  private mode: "standard" | "daily" = "standard";
  private archetypeLabel = "";
  private showingRoundResult = false;
  private confirmModal: Phaser.GameObjects.Container | null = null;

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
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0);
    this.scanlines = drawScanlines(this, 98, 0.04);
    this.glitchOverlay = drawGlitchOverlay(this, 0, 97);

    this.arenaView = new ArenaView(this, 5);
    this.combatHud = new CombatHud(this, 9);

    const lang = getLanguage();
    if (this.mode === "daily") {
      const arch = getDailyArchetype();
      this.archetypeLabel = lang === "es" ? arch.nameEs : arch.nameEn;
    } else {
      const arch = getArchetype(this.archetypeId);
      this.archetypeLabel = lang === "es" ? arch.nameEs : arch.nameEn;
    }

    const prompt = createHubPromptBar(this, 10);
    this.promptBar = prompt.container;
    this.statusText = prompt.text;

    this.roundText = this.add.text(30, L.topBar.y, "", {
      fontFamily: FONT,
      fontSize: "27px",
      color: COLORS.ember,
    }).setDepth(11);

    this.historyLog = new DuelHistoryLog(this, strings.history, 10);

    this.tauntText = this.add.text(width / 2, L.taunt.y, "", {
      fontFamily: FONT,
      fontSize: "21px",
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
      0.94,
    ).setStrokeStyle(1, C.fog).setDepth(14).setVisible(false);

    this.roundResultText = this.add.text(width / 2, L.roundResult.y, "", {
      fontFamily: FONT,
      fontSize: "20px",
      color: COLORS.bone,
      align: "center",
      wordWrap: { width: L.roundResult.w - 42 },
      lineSpacing: 3,
    }).setOrigin(0.5).setDepth(15).setVisible(false);

    this.actionTooltipText = this.add.text(width / 2, L.tooltip.y, strings.actionTooltipHint, {
      fontFamily: FONT,
      fontSize: "21px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5).setDepth(11);

    this.add
      .text(width / 2, L.topBar.y + 24, this.archetypeLabel, {
        fontFamily: FONT_DISPLAY,
        fontSize: "21px",
        color: COLORS.gold,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.adapter = new GameCoreAdapter({
      brainMode: shouldUseServerApi() ? "api" : "dummy",
      apiBaseUrl: apiBaseUrl(),
      onEvent: (event) => this.handleEvent(event),
    });

    this.actionBar = new ActionBar(
      this,
      [...ALL_PLAYER_ACTIONS],
      actionLabel,
      (action) => void this.submitPlayerAction(action),
      12,
      (action, hovering) => this.showActionTooltip(action, hovering),
    );

    void this.bootDuel();

    createHubGameChrome(this, {
      settings: {
        label: strings.settings,
        onClick: () => gameBridge.openSettingsOverlay(),
        corner: "top-right",
      },
      surrender: {
        label: strings.duelSurrender,
        onClick: () => this.showSurrenderConfirm(),
      },
    });
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
    try {
      await this.adapter.initDuel(this.mode, {
        archetypeId: this.mode === "standard" ? this.archetypeId : undefined,
      });
      this.updateHud();
      this.updateActionButtons();
    } catch (err) {
      this.statusText.setText(formatSubmitError(err)).setColor(COLORS.ember);
      this.actionBar.setEnabledMap(false, new Set());
    }
  }

  private showActionTooltip(action: PlayerAction, visible: boolean): void {
    const strings = t();
    if (visible) {
      this.actionTooltipText
        .setText(`${actionLabel(action)} — ${actionDescription(action)}`)
        .setColor(COLORS.ember);
    } else {
      this.actionTooltipText
        .setText(strings.actionTooltipHint)
        .setColor(COLORS.dust);
    }
  }

  private setPromptVisible(visible: boolean): void {
    this.promptBar.setVisible(visible);
    this.tauntText.setVisible(visible && !this.showingRoundResult);
  }

  private setTauntVisible(visible: boolean): void {
    this.tauntText.setVisible(visible && !this.showingRoundResult);
  }

  private showRoundResult(outcome: RoundOutcome): void {
    const { width } = this.scale;
    const summary = buildRoundSummary(outcome, t(), (action) =>
      actionLabel(action),
    );
    this.showingRoundResult = true;
    this.setPromptVisible(false);
    this.setTauntVisible(false);

    const lineCount = summary.text.split("\n").length;
    const panelH = Math.min(
      L.roundResult.maxH,
      Math.max(L.roundResult.h, 27 + lineCount * 21),
    );
    const panelY = L.roundResult.y;

    this.roundResultPanel.setSize(L.roundResult.w, panelH);
    this.roundResultPanel.setPosition(width / 2, panelY);
    this.roundResultText.setPosition(width / 2, panelY);
    this.roundResultText.setText(summary.text).setColor(summary.color);
    this.roundResultPanel.setVisible(true);
    this.roundResultText.setVisible(true);
    this.roundResultPanel.setAlpha(0.4);
    this.roundResultText.setAlpha(0.4);

    this.actionTooltipText.setAlpha(0.15);

    this.tweens.add({
      targets: [this.roundResultText, this.roundResultPanel],
      alpha: 1,
      duration: 200,
      ease: "Sine.Out",
    });

    this.time.delayedCall(2200, () => {
      this.showingRoundResult = false;
      this.roundResultPanel.setVisible(false);
      this.roundResultText.setVisible(false);
      this.actionTooltipText.setAlpha(1);
      this.setPromptVisible(true);
      this.setTauntVisible(true);
    });
  }

  private playFireFlash(): void {
    const { width } = this.scale;
    const flash = this.add.circle(width / 2, L.arena.y + 45, 60, C.ember, 0.7).setDepth(20);
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
    const { width } = this.scale;
    if (outcome.playerDamage > 0) {
      showFloatingDamage(this, 120, L.stats.hpBarY - 30, outcome.playerDamage, "player");
      this.cameras.main.flash(180, 179, 18, 43);
      this.cameras.main.shake(150, 0.005);
    }
    if (outcome.zegonDamage > 0) {
      showFloatingDamage(
        this,
        width - 120,
        L.stats.hpBarY - 30,
        outcome.zegonDamage,
        "zegon",
      );
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
        this.statusText.setText(strings.yourTurnPrompt).setColor(COLORS.bone);
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
        this.scene.start("ResultScene", {
          result: this.adapter.getResult(),
          duelId: this.adapter.getDuelId(),
          apiBaseUrl: this.adapter.getApiBaseUrl(),
          mode: this.mode,
          archetype: this.archetypeId,
          brainMode: this.adapter.getBrainMode(),
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

    this.arenaView.update(blindsight, isDeadeye);

    this.glitchOverlay.destroy();
    this.glitchOverlay = drawGlitchOverlay(this, intensity, 97);
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
    const state = this.adapter.getState();
    const history = state.playerHistory;
    const blindsight = this.adapter.getBlindsight();

    this.roundText.setText(`${strings.round} ${String(state.roundIndex + 1).padStart(2, "0")}`);

    const lines = history.map((action, i) =>
      `${strings.round} ${String(i + 1).padStart(2, "0")} · ${actionLabel(action as PlayerAction)}`,
    );
    this.historyLog.setLines(lines);

    this.combatHud.update({
      playerHp: this.adapter.getPlayerHp(),
      zegonHp: this.adapter.getZegonHp(),
      ammo: this.adapter.getAmmo(),
      blindsight,
      playerLabel: strings.hudYou,
      zegonLabel: strings.hudZegon,
      ammoLabel: strings.hudAmmo,
      blindsightLabel: `${strings.hudBlindsight}  ${blindsight}%`,
    });
  }

  private updateActionButtons(): void {
    if (this.showingRoundResult) {
      this.actionBar.setEnabledMap(false, new Set());
      return;
    }
    const available = new Set(this.adapter.getAvailableActions());
    const enabled = this.adapter.isAwaitingPlayer();
    this.actionBar.setEnabledMap(enabled, available);
  }

  private async submitPlayerAction(action: PlayerAction): Promise<void> {
    if (!this.adapter.isAwaitingPlayer()) return;
    if (!this.adapter.getAvailableActions().includes(action)) return;

    this.actionBar.setDimmedAll(true);
    this.actionTooltipText.setText("").setAlpha(0.35);
    try {
      await this.adapter.submitAction(action);
      if (isFireAction(action)) this.playFireFlash();
    } catch (err) {
      this.statusText.setText(formatSubmitError(err)).setColor(COLORS.ember);
    } finally {
      this.actionTooltipText.setText(t().actionTooltipHint).setAlpha(1);
      this.actionBar.setDimmedAll(false);
      this.updateActionButtons();
    }
  }

  shutdown(): void {
    this.confirmModal?.destroy(true);
    this.confirmModal = null;
    this.adapter?.destroy();
    this.combatHud?.destroy();
    this.actionBar?.destroy();
    this.arenaView?.destroy();
    this.historyLog?.destroy();
  }
}

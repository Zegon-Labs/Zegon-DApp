import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import { t } from "../i18n/index.js";
import type { RoundOutcome } from "@zegon/game-core";
import {
  createActionButton,
  createLabeledPanel,
  drawBlindsightMeter,
  drawDesertBackdrop,
  drawDivider,
  drawHpBar,
  drawScanlines,
  drawZegonFigure,
} from "../ui/components.js";
import { C, COLORS, FONT } from "../ui/theme.js";

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

function isFireAction(action: PlayerAction): boolean {
  return action === PlayerAction.FIRE_HIGH || action === PlayerAction.FIRE_LOW;
}

export class DuelScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private backdrop!: Phaser.GameObjects.Container;
  private zegonFigure!: Phaser.GameObjects.Container;
  private roundText!: Phaser.GameObjects.Text;
  private historyBody!: Phaser.GameObjects.Text;
  private blindsightLabel!: Phaser.GameObjects.Text;
  private blindsightGfx!: Phaser.GameObjects.Graphics;
  private hpGfx!: Phaser.GameObjects.Graphics;
  private playerStats!: Phaser.GameObjects.Text;
  private zegonStats!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private tauntText!: Phaser.GameObjects.Text;
  private actionButtons: {
    bg: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
  }[] = [];
  private mode: "standard" | "daily" = "standard";

  constructor() {
    super("DuelScene");
  }

  init(data: { mode?: "standard" | "daily" }): void {
    this.mode = data.mode ?? "standard";
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    this.backdrop = drawDesertBackdrop(this, 0);
    drawScanlines(this);
    drawDivider(this, height - 100);

    this.zegonFigure = drawZegonFigure(this, width / 2, height * 0.42, 0);

    this.roundText = this.add.text(20, 14, "", {
      fontFamily: FONT,
      fontSize: "18px",
      color: COLORS.ember,
    }).setDepth(10);

    const historyPanel = createLabeledPanel(this, 20, 52, 160, 110, strings.history, 10);
    this.historyBody = historyPanel.body;

    this.blindsightLabel = this.add.text(width - 20, 14, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.ember,
    }).setOrigin(1, 0).setDepth(10);

    this.blindsightGfx = this.add.graphics().setDepth(10);
    this.hpGfx = this.add.graphics().setDepth(10);

    this.playerStats = this.add.text(20, height - 88, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.bone,
    }).setDepth(10);

    this.zegonStats = this.add.text(width - 20, height - 88, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.ember,
    }).setOrigin(1, 0).setDepth(10);

    this.statusText = this.add.text(width / 2, height * 0.18, strings.duelTitle, {
      fontFamily: FONT,
      fontSize: "22px",
      color: COLORS.cyan,
      align: "center",
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5).setDepth(10);

    this.tauntText = this.add.text(width / 2, height * 0.58, "", {
      fontFamily: FONT,
      fontSize: "17px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: width * 0.6 },
    }).setOrigin(0.5).setDepth(10);

    this.adapter = new GameCoreAdapter({
      brainMode: import.meta.env.VITE_USE_OG_COMPUTE === "true" ? "api" : "dummy",
      apiBaseUrl: "",
      onEvent: (event) => this.handleEvent(event),
    });

    this.createActionButtons();
    void this.adapter.initDuel(this.mode);
    this.updateHud();
  }

  private createActionButtons(): void {
    const actions = Object.values(PlayerAction);
    const { width, height } = this.scale;
    const gap = 6;
    const btnW = Math.min(150, (width - 40 - gap * (actions.length - 1)) / actions.length);
    const btnH = 34;
    const y = height - 52;
    const total = actions.length * btnW + (actions.length - 1) * gap;
    let x = (width - total) / 2 + btnW / 2;

    actions.forEach((action) => {
      const btn = createActionButton(
        this, x, y, btnW, btnH, actionLabel(action),
        () => {
          if (!this.adapter.isAwaitingPlayer()) return;
          const outcome = this.adapter.submitAction(action);
          if (isFireAction(action)) this.playFireFlash();
          this.onRoundResolved(outcome);
        },
        10,
      );
      this.actionButtons.push(btn);
      x += btnW + gap;
    });
  }

  private playFireFlash(): void {
    const { width, height } = this.scale;
    const flash = this.add.circle(width / 2, height * 0.55, 40, C.ember, 0.7).setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 280,
      onComplete: () => flash.destroy(),
    });
    this.cameras.main.shake(100, 0.003);
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    if (outcome.playerDamage > 0) {
      this.cameras.main.flash(180, 179, 18, 43);
    }
  }

  private handleEvent(event: { type: string }): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText(strings.zegonReading).setColor(COLORS.ember);
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText(strings.yourTurnPrompt).setColor(COLORS.cyan);
        this.tauntText.setText(this.adapter.getPendingTaunt() ?? "");
      } else if (phase === DuelPhase.DEADEYE) {
        this.statusText.setText(strings.deadeye).setColor(COLORS.ember);
        this.cameras.main.flash(280, 255, 77, 46);
      }
    }

    if (event.type === "duelEnd") {
      this.time.delayedCall(800, () => {
        this.scene.start("ResultScene", { result: this.adapter.getResult() });
      });
    }

    this.updateHud();
    this.updateActionButtons();
    this.updateArena();
  }

  private updateArena(): void {
    const blindsight = this.adapter.getBlindsight();
    const isDeadeye = blindsight >= 80;

    this.zegonFigure.destroy();
    this.zegonFigure = drawZegonFigure(
      this,
      this.scale.width / 2,
      this.scale.height * 0.42,
      blindsight,
      isDeadeye,
    );

    this.backdrop.destroy();
    this.backdrop = drawDesertBackdrop(this, blindsight / 100);
    this.backdrop.setDepth(0);
  }

  private updateHud(): void {
    const strings = t();
    const { width, height } = this.scale;
    const state = this.adapter.getState();
    const history = state.playerHistory;
    const blindsight = this.adapter.getBlindsight();
    const playerHp = this.adapter.getPlayerHp();
    const zegonHp = this.adapter.getZegonHp();

    this.roundText.setText(`${strings.round} ${String(state.roundIndex + 1).padStart(2, "0")}`);

    const lines = history.slice(-5).map((action, i) => {
      const r = history.length - history.slice(-5).length + i + 1;
      return `R${r} ${actionLabel(action as PlayerAction)}`;
    });
    this.historyBody.setText(lines.length > 0 ? lines.join("\n") : "—");

    this.blindsightLabel.setText(`${strings.hudBlindsight}  ${blindsight}%`);
    drawBlindsightMeter(this.blindsightGfx, width - 216, 38, 196, 8, blindsight);

    drawHpBar(this.hpGfx, 20, height - 108, 120, 6, playerHp, 100, C.cyan);
    drawHpBar(this.hpGfx, width - 140, height - 108, 120, 6, zegonHp, 100, C.ember);

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
      btn.text.setText(actionLabel(action));
      btn.bg.setStrokeStyle(active ? 2 : 1, active ? C.cyan : C.fog);
      btn.bg.setFillStyle(active ? C.smoke : C.ash, active ? 1 : 0.55);
      btn.text.setColor(active ? COLORS.bone : COLORS.dust);
      btn.bg.setAlpha(active ? 1 : 0.5);
      btn.text.setAlpha(active ? 1 : 0.5);
    });
  }

  shutdown(): void {
    this.adapter?.destroy();
  }
}

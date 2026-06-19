import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";
import { coverImage } from "../config/assets.js";
import { t } from "../i18n/index.js";
import type { RoundOutcome } from "@zegon/game-core";

const UI = {
  font: "VT323, monospace",
  color: {
    bone: "#E6E1D3",
    dust: "#9A93A8",
    cyan: "#2EE6D6",
    ember: "#FF4D2E",
    blood: "#B3122B",
  },
};

function actionLabel(action: PlayerAction): string {
  const strings = t();
  const map: Record<PlayerAction, string> = {
    [PlayerAction.FIRE_HIGH]: strings.actionFireHigh,
    [PlayerAction.FIRE_LOW]: strings.actionFireLow,
    [PlayerAction.DODGE]: strings.actionDodge,
    [PlayerAction.FEINT]: strings.actionFeint,
    [PlayerAction.RELOAD]: strings.actionReload,
  };
  return map[action];
}

function isFireAction(action: PlayerAction): boolean {
  return action === PlayerAction.FIRE_HIGH || action === PlayerAction.FIRE_LOW;
}

export class DuelScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private bgNormal!: Phaser.GameObjects.Image;
  private bgDamaged!: Phaser.GameObjects.Image;
  private fireOverlay!: Phaser.GameObjects.Image;
  private roundText!: Phaser.GameObjects.Text;
  private historyText!: Phaser.GameObjects.Text;
  private blindsightLabel!: Phaser.GameObjects.Text;
  private blindsightBar!: Phaser.GameObjects.Graphics;
  private playerStats!: Phaser.GameObjects.Text;
  private zegonStats!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private tauntText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Container[] = [];
  private mode: "standard" | "daily" = "standard";

  constructor() {
    super("DuelScene");
  }

  init(data: { mode?: "standard" | "daily" }): void {
    this.mode = data.mode ?? "standard";
  }

  create(): void {
    const { width, height } = this.scale;

    this.bgNormal = coverImage(this, "duel_normal", 0);
    this.bgDamaged = coverImage(this, "duel_damaged", 1).setAlpha(0);
    this.fireOverlay = coverImage(this, "duel_fire", 5).setAlpha(0);

    this.add
      .rectangle(0, 0, width, height, 0x0a0911, 0.35)
      .setOrigin(0)
      .setDepth(2);

    this.roundText = this.add.text(24, 16, "", {
      fontFamily: UI.font,
      fontSize: "20px",
      color: UI.color.ember,
    }).setDepth(10);

    this.historyText = this.add.text(24, 52, "", {
      fontFamily: UI.font,
      fontSize: "16px",
      color: UI.color.dust,
      lineSpacing: 4,
    }).setDepth(10);

    this.blindsightLabel = this.add.text(width - 24, 16, "", {
      fontFamily: UI.font,
      fontSize: "18px",
      color: UI.color.ember,
    }).setOrigin(1, 0).setDepth(10);

    this.blindsightBar = this.add.graphics().setDepth(10);

    this.playerStats = this.add.text(24, height - 130, "", {
      fontFamily: UI.font,
      fontSize: "18px",
      color: UI.color.bone,
    }).setDepth(10);

    this.zegonStats = this.add.text(width - 24, height - 130, "", {
      fontFamily: UI.font,
      fontSize: "18px",
      color: UI.color.ember,
    }).setOrigin(1, 0).setDepth(10);

    this.statusText = this.add.text(width / 2, height * 0.38, "", {
      fontFamily: UI.font,
      fontSize: "24px",
      color: UI.color.cyan,
      align: "center",
      wordWrap: { width: width * 0.7 },
    }).setOrigin(0.5).setDepth(10);

    this.tauntText = this.add.text(width / 2, height * 0.48, "", {
      fontFamily: UI.font,
      fontSize: "18px",
      color: UI.color.ember,
      align: "center",
      wordWrap: { width: width * 0.55 },
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
    const totalW = width - 48;
    const btnW = Math.min(140, totalW / actions.length - 8);
    const y = height - 56;
    const startX = 24 + btnW / 2;

    actions.forEach((action, i) => {
      const x = startX + i * (btnW + 8);
      const bg = this.add
        .rectangle(x, y, btnW, 36, 0x14121c, 0.9)
        .setStrokeStyle(1, 0xff4d2e)
        .setDepth(10);

      const label = this.add.text(x, y, actionLabel(action), {
        fontFamily: UI.font,
        fontSize: "14px",
        color: UI.color.dust,
        align: "center",
      }).setOrigin(0.5).setDepth(11);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        if (this.adapter.isAwaitingPlayer()) {
          const outcome = this.adapter.submitAction(action);
          if (isFireAction(action)) {
            this.playFireFlash();
          }
          this.onRoundResolved(outcome);
        }
      });

      this.actionButtons.push(this.add.container(0, 0, [bg, label]));
    });
  }

  private playFireFlash(): void {
    this.fireOverlay.setAlpha(1);
    this.tweens.add({
      targets: this.fireOverlay,
      alpha: 0,
      duration: 350,
      ease: "Power2",
    });
    this.cameras.main.shake(120, 0.004);
  }

  private onRoundResolved(outcome: RoundOutcome): void {
    if (outcome.playerDamage > 0) {
      this.cameras.main.flash(200, 179, 18, 43);
    }
    if (outcome.zegonDamage > 0) {
      this.tweens.add({
        targets: this.bgNormal,
        alpha: 0.85,
        yoyo: true,
        duration: 80,
        repeat: 1,
      });
    }
  }

  private handleEvent(event: {
    type: string;
    outcome?: RoundOutcome;
  }): void {
    const strings = t();

    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText(strings.zegonReading);
        this.statusText.setColor(UI.color.ember);
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText(strings.yourTurnPrompt);
        this.statusText.setColor(UI.color.cyan);
        this.tauntText.setText(this.adapter.getPendingTaunt() ?? "");
      } else if (phase === DuelPhase.DEADEYE) {
        this.statusText.setText(strings.deadeye);
        this.statusText.setColor(UI.color.ember);
        this.cameras.main.flash(300, 255, 77, 46);
      }
    }

    if (event.type === "duelEnd") {
      this.time.delayedCall(900, () => {
        this.scene.start("ResultScene", { result: this.adapter.getResult() });
      });
    }

    this.updateHud();
    this.updateActionButtons();
    this.updateBackgroundState();
  }

  private updateBackgroundState(): void {
    const blindsight = this.adapter.getBlindsight();
    const zegonHp = this.adapter.getZegonHp();
    const playerHp = this.adapter.getPlayerHp();
    const damaged =
      blindsight >= 70 || zegonHp <= 25 || playerHp <= 30;

    this.tweens.add({
      targets: this.bgDamaged,
      alpha: damaged ? 1 : 0,
      duration: 400,
    });
  }

  private updateHud(): void {
    const strings = t();
    const state = this.adapter.getState();
    const round = state.roundIndex;
    const history = state.playerHistory;

    this.roundText.setText(`${strings.round} ${String(round + 1).padStart(2, "0")}`);

    const historyLines = history.slice(-4).map((action, i) => {
      const r = history.length - history.slice(-4).length + i + 1;
      return `R${r} ${actionLabel(action as PlayerAction)}`;
    });
    this.historyText.setText(
      history.length > 0
        ? `${strings.history}\n${historyLines.join("\n")}`
        : `${strings.history}\n—`,
    );

    const blindsight = this.adapter.getBlindsight();
    this.blindsightLabel.setText(
      `${strings.hudBlindsight}\n${blindsight}%`,
    );
    this.drawBlindsightBar(blindsight);

    this.playerStats.setText(
      `${strings.hudYou}\n${this.adapter.getPlayerHp()} ${strings.hudHp}  ·  ${strings.hudAmmo} x${this.adapter.getAmmo()}`,
    );

    const deadeyeNear = blindsight >= 80;
    this.zegonStats.setText(
      `${strings.hudZegon}\n${this.adapter.getZegonHp()} ${strings.hudHp}` +
      (deadeyeNear ? `\n${strings.deadeyeNear}` : ""),
    );
  }

  private drawBlindsightBar(value: number): void {
    const { width } = this.scale;
    const x = width - 220;
    const y = 52;
    const w = 196;
    const h = 10;
    const fill = (value / 100) * w;

    this.blindsightBar.clear();
    this.blindsightBar.fillStyle(0x211e2e, 0.9);
    this.blindsightBar.fillRect(x, y, w, h);
    this.blindsightBar.fillStyle(0xff4d2e, 1);
    this.blindsightBar.fillRect(x, y, fill, h);
  }

  private updateActionButtons(): void {
    const available = new Set(this.adapter.getAvailableActions());
    const enabled = this.adapter.isAwaitingPlayer();

    this.actionButtons.forEach((container, i) => {
      const action = Object.values(PlayerAction)[i]!;
      const active = enabled && available.has(action);
      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      const label = container.list[1] as Phaser.GameObjects.Text;

      label.setText(actionLabel(action));
      bg.setStrokeStyle(active ? 2 : 1, active ? 0x2ee6d6 : 0x3a3550);
      bg.setFillStyle(active ? 0x211e2e : 0x14121c, active ? 0.95 : 0.7);
      label.setColor(active ? UI.color.bone : UI.color.dust);
      bg.setAlpha(active ? 1 : 0.45);
      label.setAlpha(active ? 1 : 0.45);
    });
  }

  shutdown(): void {
    this.adapter?.destroy();
  }
}

import Phaser from "phaser";
import {
  GameCoreAdapter,
  DuelPhase,
  PlayerAction,
} from "../adapters/GameCoreAdapter.js";

const ACTION_LABELS: Record<PlayerAction, string> = {
  [PlayerAction.FIRE_HIGH]: "FIRE HIGH",
  [PlayerAction.FIRE_LOW]: "FIRE LOW",
  [PlayerAction.DODGE]: "DODGE",
  [PlayerAction.FEINT]: "FEINT",
  [PlayerAction.RELOAD]: "RELOAD",
};

export class DuelScene extends Phaser.Scene {
  private adapter!: GameCoreAdapter;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private tauntText!: Phaser.GameObjects.Text;
  private blindsightBar!: Phaser.GameObjects.Graphics;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private mode: "standard" | "daily" = "standard";

  constructor() {
    super("DuelScene");
  }

  init(data: { mode?: "standard" | "daily" }): void {
    this.mode = data.mode ?? "standard";
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 30, "DUEL", {
        fontFamily: "VT323, monospace",
        fontSize: "32px",
        color: "#E6E1D3",
      })
      .setOrigin(0.5);

    this.hudText = this.add.text(20, 60, "", {
      fontFamily: "VT323, monospace",
      fontSize: "22px",
      color: "#E6E1D3",
    });

    this.statusText = this.add.text(width / 2, height / 2 - 40, "", {
      fontFamily: "VT323, monospace",
      fontSize: "28px",
      color: "#2EE6D6",
    }).setOrigin(0.5);

    this.tauntText = this.add.text(width / 2, height / 2, "", {
      fontFamily: "VT323, monospace",
      fontSize: "20px",
      color: "#FF4D2E",
    }).setOrigin(0.5);

    this.blindsightBar = this.add.graphics();

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
    const startX = 80;
    const y = this.scale.height - 60;

    actions.forEach((action, i) => {
      const btn = this.add
        .text(startX + i * 150, y, ACTION_LABELS[action], {
          fontFamily: "VT323, monospace",
          fontSize: "20px",
          color: "#9A93A8",
        })
        .setInteractive({ useHandCursor: true });

      btn.on("pointerdown", () => {
        if (this.adapter.isAwaitingPlayer()) {
          this.adapter.submitAction(action);
        }
      });

      this.actionButtons.push(btn);
    });
  }

  private handleEvent(event: { type: string; outcome?: { zegonDecision: { taunt: string } } }): void {
    if (event.type === "phaseChange") {
      const phase = this.adapter.getPhase();
      if (phase === DuelPhase.ZEGON_THINKING) {
        this.statusText.setText("ZEGON is reading you...");
        this.statusText.setColor("#FF4D2E");
      } else if (phase === DuelPhase.AWAITING_PLAYER) {
        this.statusText.setText("YOUR MOVE");
        this.statusText.setColor("#2EE6D6");
        this.tauntText.setText(this.adapter.getPendingTaunt() ?? "");
      } else if (phase === DuelPhase.DEADEYE) {
        this.statusText.setText("DEADEYE!");
        this.statusText.setColor("#FF4D2E");
        this.cameras.main.flash(300, 255, 77, 46);
      }
    }

    if (event.type === "duelEnd") {
      this.time.delayedCall(800, () => {
        this.scene.start("ResultScene", { result: this.adapter.getResult() });
      });
    }

    this.updateHud();
    this.updateActionButtons();
  }

  private updateHud(): void {
    this.hudText.setText(
      `YOU: ${this.adapter.getPlayerHp()} HP  |  ZEGON: ${this.adapter.getZegonHp()} HP\n` +
      `AMMO: ${this.adapter.getAmmo()}  |  BLINDSIGHT: ${this.adapter.getBlindsight()}%`,
    );
    this.drawBlindsightBar();
  }

  private drawBlindsightBar(): void {
    const x = this.scale.width / 2 - 150;
    const y = 100;
    const w = 300;
    const h = 12;
    const fill = (this.adapter.getBlindsight() / 100) * w;

    this.blindsightBar.clear();
    this.blindsightBar.fillStyle(0x211e2e);
    this.blindsightBar.fillRect(x, y, w, h);
    this.blindsightBar.fillStyle(0xff4d2e);
    this.blindsightBar.fillRect(x, y, fill, h);
  }

  private updateActionButtons(): void {
    const available = new Set(this.adapter.getAvailableActions());
    const enabled = this.adapter.isAwaitingPlayer();

    this.actionButtons.forEach((btn, i) => {
      const action = Object.values(PlayerAction)[i]!;
      const active = enabled && available.has(action);
      btn.setColor(active ? "#E6E1D3" : "#3A3550");
      btn.setAlpha(active ? 1 : 0.4);
    });
  }

  shutdown(): void {
    this.adapter?.destroy();
  }
}

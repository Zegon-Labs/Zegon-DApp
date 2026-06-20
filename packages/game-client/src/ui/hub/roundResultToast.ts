import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT } from "../theme.js";
import { createHubPanelGraphics } from "./hubPanel.js";

/** Compact round-result strip on the right side of the arena. */
export class RoundResultToast {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;
  private readonly layout = L.roundToast;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, depth = 14) {
    const { w, h, x, y } = this.layout;
    this.container = scene.add
      .container(x + w / 2, y + h / 2)
      .setDepth(depth)
      .setVisible(false);

    this.container.add(createHubPanelGraphics(scene, w, h));

    this.body = scene.add.text(-w / 2 + 12, -h / 2 + 10, "", {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.bone,
      lineSpacing: 4,
      wordWrap: { width: w - 24 },
    }).setOrigin(0, 0);
    this.container.add(this.body);
  }

  show(text: string, color: string, durationMs = 2200): void {
    this.hideTimer?.remove(false);
    this.body.setText(text).setColor(color);
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setX(this.layout.x + this.layout.w / 2 + 24);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      x: this.layout.x + this.layout.w / 2,
      duration: 200,
      ease: "Sine.Out",
    });

    this.hideTimer = this.container.scene.time.delayedCall(durationMs, () => this.hide());
  }

  hide(): void {
    this.hideTimer?.remove(false);
    this.hideTimer = null;
    if (!this.container.visible) return;
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      x: this.layout.x + this.layout.w / 2 + 16,
      duration: 180,
      ease: "Sine.In",
      onComplete: () => this.container.setVisible(false),
    });
  }

  destroy(): void {
    this.hideTimer?.remove(false);
    this.container.destroy(true);
  }
}

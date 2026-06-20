import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT_DISPLAY } from "../theme.js";

const LINE_STEP = 21;

/** Round-result copy — right side, blood red, staggered line reveal. */
export class RoundResultToast {
  readonly container: Phaser.GameObjects.Container;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private readonly maxW: number;
  private readonly lineTexts: Phaser.GameObjects.Text[] = [];
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private entryTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, depth = 14) {
    const { x, y, maxW } = L.roundToast;
    this.anchorX = x;
    this.anchorY = y;
    this.maxW = maxW;

    this.container = scene.add
      .container(this.anchorX, this.anchorY)
      .setDepth(depth)
      .setVisible(false);
  }

  show(text: string, _color?: string, durationMs = 2200): void {
    this.hideTimer?.remove(false);
    this.killEntryTweens();
    this.clearLines();

    const lines = text.split("\n").filter((line) => line.length > 0);
    const scene = this.container.scene;

    lines.forEach((line, index) => {
      const lineText = scene.add
        .text(0, index * LINE_STEP, line, {
          fontFamily: FONT_DISPLAY,
          fontSize: "16px",
          color: COLORS.blood,
          align: "right",
          letterSpacing: 1.2,
          wordWrap: { width: this.maxW },
        })
        .setOrigin(1, 0)
        .setAlpha(0)
        .setX(22);

      this.container.add(lineText);
      this.lineTexts.push(lineText);

      const tween = scene.tweens.add({
        targets: lineText,
        alpha: 1,
        x: 0,
        duration: 320,
        delay: 60 + index * 70,
        ease: "Back.easeOut",
      });
      this.entryTweens.push(tween);
    });

    this.container.setVisible(true).setAlpha(1).setX(this.anchorX).setY(this.anchorY);

    this.hideTimer = scene.time.delayedCall(durationMs, () => this.hide());
  }

  hide(): void {
    this.hideTimer?.remove(false);
    this.hideTimer = null;
    if (!this.container.visible) return;

    this.killEntryTweens();
    const scene = this.container.scene;
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      x: this.anchorX + 16,
      y: this.anchorY + 6,
      duration: 220,
      ease: "Sine.In",
      onComplete: () => {
        this.clearLines();
        this.container.setVisible(false).setAlpha(1).setX(this.anchorX).setY(this.anchorY);
      },
    });
  }

  destroy(): void {
    this.hideTimer?.remove(false);
    this.killEntryTweens();
    this.clearLines();
    this.container.destroy(true);
  }

  private clearLines(): void {
    for (const line of this.lineTexts) {
      line.destroy();
    }
    this.lineTexts.length = 0;
  }

  private killEntryTweens(): void {
    for (const tween of this.entryTweens) {
      tween.stop();
    }
    this.entryTweens.length = 0;
  }
}

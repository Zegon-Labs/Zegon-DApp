import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import type { RoundSummaryLine, RoundSummaryLineRole } from "../roundSummary.js";
import { COLORS, FONT_DISPLAY } from "../theme.js";

const LINE_STEP = 22;

function lineStyle(role: RoundSummaryLineRole): {
  fontSize: string;
  color: string;
  letterSpacing: number;
} {
  switch (role) {
    case "headline":
      return { fontSize: "19px", color: COLORS.ember, letterSpacing: 2.4 };
    case "outcome":
      return { fontSize: "16px", color: COLORS.blood, letterSpacing: 1.4 };
    case "delta":
      return { fontSize: "15px", color: COLORS.bone, letterSpacing: 1.2 };
    case "damage":
      return { fontSize: "15px", color: COLORS.blood, letterSpacing: 1.2 };
    case "note":
      return { fontSize: "14px", color: COLORS.dust, letterSpacing: 1 };
    default:
      return { fontSize: "16px", color: COLORS.blood, letterSpacing: 1.2 };
  }
}

/** Round-result copy — right side, staggered line reveal. */
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

  show(lines: RoundSummaryLine[], durationMs: number): void {
    this.hideTimer?.remove(false);
    this.killEntryTweens();
    this.clearLines();

    const scene = this.container.scene;

    lines.forEach((line, index) => {
      const style = lineStyle(line.role);
      const lineText = scene.add
        .text(0, index * LINE_STEP, line.text, {
          fontFamily: FONT_DISPLAY,
          fontSize: style.fontSize,
          color: style.color,
          align: "right",
          letterSpacing: style.letterSpacing,
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
        duration: 340,
        delay: 80 + index * 90,
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
      duration: 280,
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

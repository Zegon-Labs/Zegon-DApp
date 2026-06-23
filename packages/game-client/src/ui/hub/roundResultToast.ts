import Phaser from "phaser";
import { t } from "../../i18n/index.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import type { RoundSummaryLine, RoundSummaryLineRole } from "../roundSummary.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";

const DISMISS_DRAG_PX = 72;
const SWAY_PX = 11;
const LINE_GAP = 6;

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

/** Round-result copy — drag away to dismiss. */
export class RoundResultToast {
  readonly container: Phaser.GameObjects.Container;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private readonly maxW: number;
  private readonly lineTexts: Phaser.GameObjects.Text[] = [];
  private entryTweens: Phaser.Tweens.Tween[] = [];
  private hintPulseTween: Phaser.Tweens.Tween | null = null;
  private hintSwayTween: Phaser.Tweens.Tween | null = null;
  private hintPulseTimer: Phaser.Time.TimerEvent | null = null;
  private dragHit: Phaser.GameObjects.Rectangle | null = null;
  private dragHintText: Phaser.GameObjects.Text | null = null;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private containerStartX = 0;
  private containerStartY = 0;
  private onDismissed: (() => void) | null = null;
  private dismissNotified = false;

  constructor(scene: Phaser.Scene, depth = 14) {
    const { x, y, maxW } = L.roundToast;
    this.anchorX = x;
    this.anchorY = y;
    this.maxW = maxW;

    this.container = scene.add
      .container(this.anchorX, this.anchorY)
      .setDepth(depth)
      .setVisible(false);

    scene.input.on("pointermove", this.handlePointerMove);
    scene.input.on("pointerup", this.handlePointerUp);
  }

  show(lines: RoundSummaryLine[], onDismissed?: () => void): void {
    this.killEntryTweens();
    this.stopHintAnimations();
    this.clearLines();
    this.onDismissed = onDismissed ?? null;
    this.dismissNotified = false;
    this.dragging = false;

    const scene = this.container.scene;
    let y = 0;

    lines.forEach((line, index) => {
      const style = lineStyle(line.role);
      const lineText = scene.add
        .text(0, y, line.text, {
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
      y += lineText.height + LINE_GAP;

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

    const contentH = Math.max(y, 72);
    const hitH = contentH + 20;
    this.dragHintText = scene.add
      .text(-this.maxW / 2, hitH + 8, t().roundSummaryDragHint, {
        fontFamily: FONT,
        fontSize: "11px",
        color: COLORS.dust,
        letterSpacing: 1.2,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);

    this.container.add(this.dragHintText);

    const hintRevealMs = 80 + Math.max(0, lines.length - 1) * 90 + 340;
    scene.tweens.add({
      targets: this.dragHintText,
      alpha: 0.82,
      duration: 280,
      delay: hintRevealMs,
      ease: "Sine.Out",
    });

    this.dragHit = scene.add
      .rectangle(
        -this.maxW / 2,
        (hitH + 28) / 2,
        this.maxW + 24,
        hitH + 28,
        0xffffff,
        0.001,
      )
      .setInteractive({ useHandCursor: true });
    this.dragHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.stopHintAnimations();
      this.dragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.containerStartX = this.container.x;
      this.containerStartY = this.container.y;
      scene.input.setDefaultCursor("grabbing");
    });
    this.container.add(this.dragHit);

    this.container.setVisible(true).setAlpha(1).setX(this.anchorX).setY(this.anchorY);
    this.scheduleHintAnimations(lines.length);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  hide(notify = false): void {
    if (!this.container.visible) return;

    this.killEntryTweens();
    this.stopHintAnimations();
    this.dragging = false;
    this.container.scene.input.setDefaultCursor("default");

    const scene = this.container.scene;
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      x: this.anchorX + 16,
      y: this.anchorY + 6,
      duration: 280,
      ease: "Sine.In",
      onComplete: () => {
        this.finishHide(notify);
      },
    });
  }

  destroy(): void {
    const scene = this.container.scene;
    scene.input.off("pointermove", this.handlePointerMove);
    scene.input.off("pointerup", this.handlePointerUp);
    this.killEntryTweens();
    this.stopHintAnimations();
    this.clearLines();
    this.container.destroy(true);
  }

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.dragging || !pointer.isDown || !this.container.visible) return;

    const dx = pointer.x - this.dragStartX;
    const dy = pointer.y - this.dragStartY;
    this.container.setPosition(this.containerStartX + dx, this.containerStartY + dy);

    const dist = Math.hypot(dx, dy);
    this.container.setAlpha(Phaser.Math.Clamp(1 - dist / 220, 0.4, 1));
  };

  private handlePointerUp = (): void => {
    if (!this.dragging || !this.container.visible) return;

    this.dragging = false;
    this.container.scene.input.setDefaultCursor("default");

    const dx = this.container.x - this.containerStartX;
    const dy = this.container.y - this.containerStartY;
    const dist = Math.hypot(dx, dy);

    if (dist >= DISMISS_DRAG_PX) {
      this.dismissDragged(dx, dy);
      return;
    }

    const scene = this.container.scene;
    scene.tweens.add({
      targets: this.container,
      x: this.anchorX,
      y: this.containerStartY,
      alpha: 1,
      duration: 220,
      ease: "Back.easeOut",
      onComplete: () => this.startHintAnimations(),
    });
  };

  private dismissDragged(dx: number, dy: number): void {
    this.killEntryTweens();
    this.stopHintAnimations();
    this.dragging = false;

    const len = Math.max(Math.hypot(dx, dy), 1);
    const nx = dx / len;
    const ny = dy / len;
    const scene = this.container.scene;

    scene.tweens.add({
      targets: this.container,
      x: this.container.x + nx * 140,
      y: this.container.y + ny * 90,
      alpha: 0,
      duration: 240,
      ease: "Sine.In",
      onComplete: () => this.finishHide(true),
    });
  }

  private finishHide(notify: boolean): void {
    this.stopHintAnimations();
    this.clearLines();
    this.container.setVisible(false).setAlpha(1).setX(this.anchorX).setY(this.anchorY);
    if (notify && !this.dismissNotified) {
      this.dismissNotified = true;
      this.onDismissed?.();
      this.onDismissed = null;
    }
  }

  private clearLines(): void {
    if (this.dragHit) {
      this.dragHit.destroy();
      this.dragHit = null;
    }
    if (this.dragHintText) {
      this.dragHintText.destroy();
      this.dragHintText = null;
    }
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

  private scheduleHintAnimations(lineCount: number): void {
    this.stopHintAnimations();
    const revealMs = 80 + Math.max(0, lineCount - 1) * 90 + 340 + 160;
    this.hintPulseTimer = this.container.scene.time.delayedCall(revealMs, () => {
      this.hintPulseTimer = null;
      this.startHintAnimations();
    });
  }

  private startHintAnimations(): void {
    if (!this.container.visible || this.dragging || this.lineTexts.length === 0) return;

    this.stopHintAnimations();
    const scene = this.container.scene;
    const pulseTargets = this.dragHintText
      ? [...this.lineTexts, this.dragHintText]
      : this.lineTexts;

    for (const target of pulseTargets) {
      target.setAlpha(1);
    }

    this.container.setX(this.anchorX - SWAY_PX);

    this.hintSwayTween = scene.tweens.add({
      targets: this.container,
      x: this.anchorX + SWAY_PX,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.hintPulseTween = scene.tweens.add({
      targets: pulseTargets,
      alpha: { from: 0.62, to: 1 },
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopHintAnimations(): void {
    this.hintPulseTimer?.remove(false);
    this.hintPulseTimer = null;
    this.hintPulseTween?.stop();
    this.hintPulseTween = null;
    this.hintSwayTween?.stop();
    this.hintSwayTween = null;

    const scene = this.container.scene;
    scene.tweens.killTweensOf(this.container);
    for (const line of this.lineTexts) {
      scene.tweens.killTweensOf(line);
      line.setAlpha(1);
    }
    if (this.dragHintText) {
      scene.tweens.killTweensOf(this.dragHintText);
      this.dragHintText.setAlpha(0.82);
    }
  }

  refreshLocale(): void {
    if (this.dragHintText) {
      this.dragHintText.setText(t().roundSummaryDragHint);
    }
  }

  /** Re-render visible summary copy after language change (keeps dismiss handler). */
  replaceLines(lines: RoundSummaryLine[]): void {
    if (!this.container.visible) return;
    const onDismissed = this.onDismissed;
    this.show(lines, onDismissed ?? undefined);
  }
}

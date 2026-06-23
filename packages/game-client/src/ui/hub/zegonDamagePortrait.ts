import Phaser from "phaser";

export const ZEGON_DAMAGE_KEY = "zegon-damage";

// PNG is 1774 × 887 px, 4 frames wide.
// frameW: floor(1774/4) = 443 — all 4 frames fit within 1772 < 1774. ✓
// frameH: floor(887 * 0.95) = 842 — trims bottom 5 % to avoid any edge artifact.
const FRAME_W = Math.floor(1774 / 4);   // 443
const FRAME_H = Math.floor(887 * 0.95); // 842

/**
 * Call in preload(). Loads the damage-state sheet as a Phaser spritesheet so
 * setFrame() is used for frame selection — avoids the setCrop + full-texture-
 * origin positioning bug where the character drifts off-center.
 */
export function preloadZegonDamagePortrait(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ZEGON_DAMAGE_KEY))
    scene.load.spritesheet(ZEGON_DAMAGE_KEY, "/sprites/zegon_damage_states.png", {
      frameWidth:  FRAME_W,
      frameHeight: FRAME_H,
    });
}

// HP % → frame index (0 = full health, 3 = critical)
function hpToFrame(hp: number, maxHp: number): number {
  const pct = (hp / Math.max(1, maxHp)) * 100;
  if (pct >= 75) return 0;
  if (pct >= 50) return 1;
  if (pct >= 25) return 2;
  return 3;
}

/**
 * Animated ZEGON portrait driven by HP state.
 *
 * Uses two overlapping Phaser Images. Frame selection via setFrame() on the
 * loaded spritesheet — correct origin/positioning regardless of frame index.
 *
 * Frame transitions: 350 ms Sine alpha crossfade.
 * Idle animation:    Sine.easeInOut yoyo on y (breathing, −4 px / 2.5 s).
 * Breathing pauses during crossfade and resumes after.
 */
export class ZegonDamagePortrait {
  private readonly scene: Phaser.Scene;

  // imgA: currently visible. imgB: ghost for crossfade, then swapped.
  private imgA: Phaser.GameObjects.Image;
  private imgB: Phaser.GameObjects.Image;

  private readonly originX: number;
  private readonly originY: number;

  private currentFrame = 0;
  private transitioning = false;
  private breathingTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    displayW: number,
    displayH: number,
    depth: number,
    fitFactor = 0.88,
  ) {
    this.scene   = scene;
    this.originX = x;
    this.originY = y;

    const scale = Math.min(
      (displayW * fitFactor) / FRAME_W,
      (displayH * fitFactor) / FRAME_H,
    );

    const mkImg = (alpha: number) =>
      scene.add
        .image(x, y, ZEGON_DAMAGE_KEY, 0)
        .setOrigin(0.5, 0.5)
        .setScale(scale)
        .setDepth(depth)
        .setAlpha(alpha);

    this.imgA = mkImg(1); // visible — frame 0
    this.imgB = mkImg(0); // hidden  — ready for next crossfade

    this.startBreathing();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** The currently visible image — use for tint, alpha, scale tweens, etc. */
  get visibleImage(): Phaser.GameObjects.Image { return this.imgA; }

  setAlpha(a: number): this {
    this.imgA.setAlpha(a);
    return this;
  }

  setTint(tint: number): this {
    this.imgA.setTint(tint);
    return this;
  }

  clearTint(): this {
    this.imgA.clearTint();
    return this;
  }

  /**
   * Call whenever ZEGON's HP changes. Triggers a crossfade only when the
   * target frame differs from the current one. Idempotent.
   */
  updateHp(hp: number, maxHp: number): void {
    const target = hpToFrame(hp, maxHp);
    if (target === this.currentFrame || this.transitioning) return;
    this.crossfadeTo(target);
  }

  destroy(): void {
    this.breathingTween?.stop();
    this.scene.tweens.killTweensOf(this.imgA);
    this.scene.tweens.killTweensOf(this.imgB);
    this.imgA.destroy();
    this.imgB.destroy();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private crossfadeTo(frame: number): void {
    this.transitioning = true;
    this.breathingTween?.pause();

    // Place imgB at the true origin x (not imgA.x which may be mid-pulse).
    this.imgB.setPosition(this.originX, this.imgA.y);
    this.imgB.setFrame(frame);
    this.imgB.setAlpha(0);

    this.scene.tweens.add({
      targets: this.imgA,
      alpha:   0,
      duration: 350,
      ease: "Sine.easeInOut",
    });

    this.scene.tweens.add({
      targets: this.imgB,
      alpha:   1,
      duration: 350,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.imgA.setFrame(frame);
        this.imgA.setPosition(this.imgB.x, this.imgB.y);
        this.imgA.setAlpha(1);
        this.imgB.setAlpha(0);

        [this.imgA, this.imgB] = [this.imgB, this.imgA];

        this.currentFrame  = frame;
        this.transitioning = false;
        this.breathingTween?.resume();
      },
    });
  }

  private startBreathing(): void {
    const BREATHE_PX = 4;
    this.breathingTween = this.scene.tweens.add({
      targets:  [this.imgA, this.imgB],
      y:        this.originY - BREATHE_PX,
      duration: 2500,
      ease:     "Sine.easeInOut",
      yoyo:     true,
      repeat:   -1,
    });
  }
}

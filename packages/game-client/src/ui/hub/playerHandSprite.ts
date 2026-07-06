import Phaser from "phaser";
import { actionPanelTopY } from "../layout.js";

export const PLAYER_HAND_KEY = "player-hand";

const FRAME_W = 443;
const FRAME_H = 443;
const FRAME_COUNT = 8;
const ANIM_KEY = "player_draw_fire";

// 8 frames @ 10 fps = 800 ms total
const DRAW_MS = 600; // frames 0-5
const FIRE_MS = 200; // frames 6-7

// Tween magnitudes in game-px
const LIFT_PX = 14;   // upward drift during draw phase
const RECOIL_PX = 20; // downward kick on fire

/**
 * Call in preload() — guards against double-load across scene restarts.
 * Asset lives at public/sprites/player_hand_draw_fire.png (4×2 grid, 443×443 cells).
 */
export function preloadPlayerHand(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PLAYER_HAND_KEY)) {
    scene.load.spritesheet(PLAYER_HAND_KEY, "/sprites/player_hand_draw_fire.png", {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
    });
  }
}

/**
 * First-person hand + revolver sprite rendered in the free zone above the bottom
 * action strip. Depth 6 — above the arena character (depth 5) and below the strip
 * background (depth 8), so the strip naturally clips the arms at the bottom.
 *
 * Idle  → frame 0, resting at originY.
 * Fire  → 8-frame sprite animation + parallel tweens:
 *          Phase 1 (0-600ms): sprite drifts upward with Back.Out overshoot
 *          Phase 2a (600-680ms): recoil kick downward
 *          Phase 2b (680-800ms): smooth recovery back to originY / originX
 * Other actions leave the sprite at frame 0 with no movement.
 */
export class PlayerHandSprite {
  private readonly sprite: Phaser.GameObjects.Sprite | null = null;
  private readonly scene: Phaser.Scene;
  private readonly originX: number = 0;
  private readonly originY: number = 0;
  private playing = false;

  constructor(scene: Phaser.Scene, depth = 6) {
    this.scene = scene;

    if (!scene.textures.exists(PLAYER_HAND_KEY)) return;

    const { width } = scene.scale;

    // Scale so the sprite looks proportioned at 1280 wide; clamps on narrower viewports.
    const scale = Math.min(1.1, (width / FRAME_W) * 0.55);

    // Position below strip top so the bottom of the arms clips behind the strip bg.
    const x = width / 2;
    const stripTop = actionPanelTopY(width);
    const y = stripTop + Math.round(FRAME_H * scale * 0.16);

    this.originX = x;
    this.originY = y;

    this.sprite = scene.add
      .sprite(x, y, PLAYER_HAND_KEY, 0)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth);

    if (!scene.anims.exists(ANIM_KEY)) {
      scene.anims.create({
        key: ANIM_KEY,
        frames: scene.anims.generateFrameNumbers(PLAYER_HAND_KEY, {
          start: 0,
          end: FRAME_COUNT - 1,
        }),
        frameRate: 10,
        repeat: 0,
      });
    }

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.playing = false;
      if (this.sprite?.active) {
        // Kill any in-flight tweens and snap back to exact resting state.
        scene.tweens.killTweensOf(this.sprite);
        this.sprite.setFrame(0);
        this.sprite.setPosition(this.originX, this.originY);
      }
    });
  }

  setVisible(visible: boolean): void {
    this.sprite?.setVisible(visible);
  }

  /** Plays the full draw-and-fire animation once; no-op if already playing. */
  playFire(): void {
    if (!this.sprite?.active || this.playing) return;
    this.playing = true;

    // Kill any leftover tweens and reset to known origin before starting.
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(this.originX, this.originY);

    this.sprite.play(ANIM_KEY);

    // Phase 1 — draw (0 → 600 ms):
    // Arms drift upward with a Back.Out overshoot so they feel like they have
    // weight — the tween slightly overshoots LIFT_PX then settles back to it.
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.originY - LIFT_PX,
      duration: DRAW_MS,
      ease: Phaser.Math.Easing.Back.Out,
    });

    // Phase 2a — recoil kick (600 → 680 ms):
    // Snap the arms downward and very slightly sideways on the fire frame,
    // simulating the physical recoil of the revolver.
    // Camera shake is intentionally skipped here: this.cameras.main.shake()
    // would jostle the entire HUD (life panels, history, buttons), which looks
    // jarring. The sprite-only offset gives the same tactile cue without
    // disturbing the UI layer.
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.originY - LIFT_PX + RECOIL_PX,
      x: this.originX + 3,
      duration: 80,
      delay: DRAW_MS,
      ease: Phaser.Math.Easing.Quadratic.In,
    });

    // Phase 2b — recovery (680 → 800 ms):
    // Float back to the exact resting position.
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.originY,
      x: this.originX,
      duration: FIRE_MS - 80,
      delay: DRAW_MS + 80,
      ease: Phaser.Math.Easing.Quadratic.Out,
    });
  }

  destroy(): void {
    if (this.sprite) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.destroy();
    }
  }
}

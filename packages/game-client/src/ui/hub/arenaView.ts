import Phaser from "phaser";
import { LANDING_CHARACTER_KEY } from "./landingBackdrop.js";
import { ZegonDamagePortrait, ZEGON_DAMAGE_KEY } from "./zegonDamagePortrait.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import { C } from "../theme.js";
import { safeShake } from "../safeShake.js";

export class ArenaView {
  readonly container: Phaser.GameObjects.Container;

  // Exactly one of these is non-null depending on which texture was available.
  private damagePortrait: ZegonDamagePortrait | null = null;
  private staticCharacter: Phaser.GameObjects.Image | null = null;

  private playerOverlay: Phaser.GameObjects.Rectangle | null = null;
  private zegonOverlay: Phaser.GameObjects.Rectangle | null = null;
  private tensionGlow: Phaser.GameObjects.Graphics | null = null;

  /** The visible Phaser Image regardless of which branch is active. */
  private get charImage(): Phaser.GameObjects.Image | null {
    return this.damagePortrait?.visibleImage ?? this.staticCharacter;
  }

  constructor(
    scene: Phaser.Scene,
    depth = 5,
    opts?: { y?: number; characterMaxH?: number },
  ) {
    const { width } = scene.scale;
    // Container holds the ADD-blend overlays; drawn at depth so overlays are
    // always above the damage portrait (which lives at depth - 1).
    this.container = scene.add.container(0, 0).setDepth(depth);

    const arenaY = opts?.y ?? L.arena.y;
    const maxH = opts?.characterMaxH ?? L.arena.characterMaxH;

    this.playerOverlay = scene.add
      .rectangle(width * 0.22, arenaY, width * 0.28, maxH * 0.55, C.blood, 1)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.zegonOverlay = scene.add
      .rectangle(width * 0.78, arenaY, width * 0.28, maxH * 0.55, C.blood, 1)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.container.add([this.playerOverlay, this.zegonOverlay]);

    this.tensionGlow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(this.tensionGlow);

    if (scene.textures.exists(ZEGON_DAMAGE_KEY)) {
      // Scale up 1.3× vs the static character so the figure fills more of the
      // arena. depth - 1 ensures the ADD-blend overlays always render on top.
      this.damagePortrait = new ZegonDamagePortrait(
        scene, width / 2, arenaY + 55, width, maxH * 1.8, depth - 1, 1.0,
      );
    } else if (scene.textures.exists(LANDING_CHARACTER_KEY)) {
      this.staticCharacter = scene.add.image(width / 2, arenaY, LANDING_CHARACTER_KEY);
      const scale = maxH / this.staticCharacter.height;
      this.staticCharacter.setScale(scale).setAlpha(0.96);
      this.container.add(this.staticCharacter);
    }
  }

  update(blindsight: number, deadeye = false, zegonHp?: number, zegonMaxHp?: number): void {
    const img = this.charImage;
    if (!img) return;

    if (this.damagePortrait) {
      this.damagePortrait.setAlpha(1);
      if (zegonHp !== undefined && zegonMaxHp !== undefined) {
        this.damagePortrait.updateHp(zegonHp, zegonMaxHp);
      }
    } else {
      img.setAlpha(0.96);
    }

    if (deadeye || blindsight >= 80) {
      this.damagePortrait ? this.damagePortrait.setTint(0xff8866) : img.setTint(0xff8866);
    } else if (blindsight >= 35) {
      const warm = blindsight >= 60 ? 0xff9977 : 0xffbbaa;
      this.damagePortrait ? this.damagePortrait.setTint(warm) : img.setTint(warm);
    } else {
      this.damagePortrait ? this.damagePortrait.clearTint() : img.clearTint();
    }

    this.tensionGlow?.clear();
  }

  pulseHit(): void {
    const img = this.charImage;
    if (!img) return;
    const baseScale = img.scale;
    this.damagePortrait ? this.damagePortrait.setTint(0xb3122b) : img.setTint(0xb3122b);
    img.scene.tweens.add({
      targets: img,
      scale: baseScale * 1.06,
      duration: 90,
      yoyo: true,
      ease: "Quad.Out",
    });
    this.flashOverlay(this.zegonOverlay, 0.45);
    img.scene.time.delayedCall(260, () => {
      if (img.active) {
        this.damagePortrait ? this.damagePortrait.clearTint() : img.clearTint();
      }
    });
  }

  pulsePlayerHit(): void {
    const img = this.charImage;
    if (!img) return;
    const baseScale = img.scaleX;
    // Scale-squeeze only — no x-drift so the character stays centered.
    // The camera shake below provides the positional hit feedback.
    img.scene.tweens.add({
      targets: img,
      scaleX: baseScale * 0.96,
      scaleY: img.scaleY * 0.96,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
    });
    this.flashOverlay(this.playerOverlay, 0.55);
    img.scene.cameras.main.flash(160, 179, 18, 43, false, undefined, 0.35);
    safeShake(img.scene, 180, 0.006);
  }

  private flashOverlay(
    overlay: Phaser.GameObjects.Rectangle | null,
    peak: number,
  ): void {
    if (!overlay) return;
    overlay.setAlpha(peak);
    overlay.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 280,
      ease: "Cubic.Out",
    });
  }

  destroy(): void {
    this.damagePortrait?.destroy();
    this.container.destroy(true);
  }
}

import Phaser from "phaser";
import { LANDING_CHARACTER_KEY } from "./landingBackdrop.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import { C } from "../theme.js";

export class ArenaView {
  readonly container: Phaser.GameObjects.Container;
  private character: Phaser.GameObjects.Image | null = null;
  private playerOverlay: Phaser.GameObjects.Rectangle | null = null;
  private zegonOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, depth = 5) {
    const { width } = scene.scale;
    this.container = scene.add.container(0, 0).setDepth(depth);

    this.playerOverlay = scene.add
      .rectangle(width * 0.22, L.arena.y, width * 0.28, L.arena.characterMaxH * 0.55, C.blood, 1)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.zegonOverlay = scene.add
      .rectangle(width * 0.78, L.arena.y, width * 0.28, L.arena.characterMaxH * 0.55, C.blood, 1)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.container.add([this.playerOverlay, this.zegonOverlay]);

    if (scene.textures.exists(LANDING_CHARACTER_KEY)) {
      this.character = scene.add.image(width / 2, L.arena.y, LANDING_CHARACTER_KEY);
      const maxH = L.arena.characterMaxH;
      const scale = maxH / this.character.height;
      this.character.setScale(scale).setAlpha(0.96);
      this.container.add(this.character);
    }
  }

  update(blindsight: number, deadeye = false): void {
    if (!this.character) return;
    const pulse = 0.94 + (blindsight / 100) * 0.06;
    this.character.setAlpha(pulse);
    if (deadeye || blindsight >= 80) {
      this.character.setTint(0xff8866);
    } else {
      this.character.clearTint();
    }
  }

  pulseHit(): void {
    if (!this.character) return;
    const baseScale = this.character.scale;
    this.character.setTint(0xb3122b);
    this.character.scene.tweens.add({
      targets: this.character,
      scale: baseScale * 1.06,
      duration: 90,
      yoyo: true,
      ease: "Quad.Out",
    });
    this.flashOverlay(this.zegonOverlay, 0.45);
    this.character.scene.time.delayedCall(260, () => {
      if (this.character?.active) this.character.clearTint();
    });
  }

  pulsePlayerHit(): void {
    if (!this.character) return;
    const baseX = this.character.x;
    const baseScale = this.character.scaleX;
    this.character.scene.tweens.add({
      targets: this.character,
      x: baseX + 14,
      scaleX: baseScale * 0.96,
      scaleY: this.character.scaleY * 0.96,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
    });
    this.flashOverlay(this.playerOverlay, 0.55);
    this.character.scene.cameras.main.flash(160, 179, 18, 43, false, undefined, 0.35);
    this.character.scene.cameras.main.shake(220, 0.012);
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
    this.container.destroy(true);
  }
}

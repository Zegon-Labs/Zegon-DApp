import Phaser from "phaser";
import { LANDING_CHARACTER_KEY } from "./landingBackdrop.js";
import { DUEL_LAYOUT as L } from "../layout.js";

export class ArenaView {
  readonly container: Phaser.GameObjects.Container;
  private character: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, depth = 5) {
    const { width } = scene.scale;
    this.container = scene.add.container(0, 0).setDepth(depth);

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
    this.character.setTint(0xb3122b);
    this.character.scene.time.delayedCall(220, () => {
      if (this.character?.active) this.character.clearTint();
    });
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

import Phaser from "phaser";
import { drawZegonFigure } from "../components.js";
import { DUEL_LAYOUT as L } from "../layout.js";

export class ArenaView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private zegonFigure: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, depth = 5) {
    this.scene = scene;
    const { width } = scene.scale;
    this.container = scene.add.container(0, 0).setDepth(depth);
    this.zegonFigure = drawZegonFigure(this.scene, width / 2, L.arena.y, 0);
    this.container.add(this.zegonFigure);
  }

  update(blindsight: number, deadeye = false): void {
    const { width } = this.scene.scale;
    this.zegonFigure.destroy();
    this.zegonFigure = drawZegonFigure(
      this.scene,
      width / 2,
      L.arena.y,
      blindsight,
      deadeye || blindsight >= 80,
    );
    this.container.add(this.zegonFigure);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

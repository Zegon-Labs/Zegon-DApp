import Phaser from "phaser";
import { C, COLORS, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L } from "../layout.js";

export function drawHubBlindsightMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
): void {
  const fill = (value / 100) * w;
  g.clear();
  g.fillStyle(C.ash, 0.92);
  g.fillRect(x, y, w, h);
  g.fillStyle(C.ember, 1);
  g.fillRect(x, y, fill, h);
  g.lineStyle(1, C.blood, 0.75);
  g.strokeRect(x, y, w, h);
}

/** Top-right blindsight label + meter. */
export class BlindsightMeter {
  readonly container: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, depth = 9) {
    this.container = scene.add.container(0, 0).setDepth(depth);
    this.gfx = scene.add.graphics();
    this.label = scene.add.text(L.blindsight.labelX, L.blindsight.labelY, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "20px",
      color: COLORS.ember,
      letterSpacing: 1,
    }).setOrigin(1, 0);
    this.container.add([this.gfx, this.label]);
  }

  update(label: string, value: number): void {
    this.label.setText(label);
    drawHubBlindsightMeter(
      this.gfx,
      L.blindsight.barX,
      L.blindsight.barY,
      L.blindsight.barW,
      L.blindsight.barH,
      value,
    );
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

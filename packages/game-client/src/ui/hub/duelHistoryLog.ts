import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { createHubPanelGraphics } from "./hubPanel.js";

/** Scrollable duel action log — entries stack downward; viewport follows the latest. */
export class DuelHistoryLog {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;
  private readonly panelH: number;
  private readonly scrollTop: number;
  private readonly viewH: number;
  private lineCount = 0;

  constructor(
    scene: Phaser.Scene,
    title: string,
    depth = 10,
    layout = L.history,
  ) {
    const padX = 14;
    const titleH = 28;
    this.panelH = layout.h;
    this.scrollTop = titleH + 6;
    this.viewH = layout.h - this.scrollTop - 10;

    this.container = scene.add
      .container(layout.x + layout.w / 2, layout.y + layout.h / 2)
      .setDepth(depth);

    this.container.add(createHubPanelGraphics(scene, layout.w, layout.h));

    this.container.add(
      scene.add.text(-layout.w / 2 + padX, -layout.h / 2 + 10, title, {
        fontFamily: FONT_DISPLAY,
        fontSize: "18px",
        color: COLORS.ember,
        letterSpacing: 1,
      }).setOrigin(0, 0),
    );

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(
      -layout.w / 2 + padX,
      -layout.h / 2 + this.scrollTop,
      layout.w - padX * 2,
      this.viewH,
    );
    const mask = maskGfx.createGeometryMask();
    maskGfx.setVisible(false);

    this.body = scene.add.text(-layout.w / 2 + padX, this.baseY(), "—", {
      fontFamily: FONT,
      fontSize: "20px",
      color: COLORS.bone,
      lineSpacing: 5,
      wordWrap: { width: layout.w - padX * 2 },
    }).setOrigin(0, 0);
    this.body.setMask(mask);
    this.container.add([this.body, maskGfx]);
  }

  private baseY(): number {
    return -this.panelH / 2 + this.scrollTop;
  }

  /** Replace log lines; scrolls down when content exceeds the panel. */
  setLines(lines: string[]): void {
    const next = lines.length > 0 ? lines : ["—"];
    const grew = next.length > this.lineCount;
    this.lineCount = next.length;

    this.body.setText(next.join("\n"));

    const overflow = this.body.height - this.viewH;
    const targetY = overflow > 0 ? this.baseY() - overflow : this.baseY();

    if (grew && overflow > 0) {
      this.container.scene.tweens.add({
        targets: this.body,
        y: targetY,
        duration: 220,
        ease: "Sine.Out",
      });
    } else {
      this.body.setY(targetY);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

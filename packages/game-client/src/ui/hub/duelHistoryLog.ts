import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { createHubPanelGraphics } from "./hubPanel.js";
import { paintDuelFrameCorners } from "./duelHudDraw.js";

/** Scrollable duel action log — entries stack downward; viewport follows the latest. */
export class DuelHistoryLog {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;
  private readonly bodyTop: number;
  private readonly viewH: number;
  private readonly viewW: number;

  constructor(
    scene: Phaser.Scene,
    title: string,
    depth = 12,
    layout = L.history,
  ) {
    const padX = 14;
    const titleH = 28;
    const bodyX = -layout.w / 2 + padX;
    this.bodyTop = -layout.h / 2 + titleH + 8;
    this.viewH = layout.h - titleH - 16;
    this.viewW = layout.w - padX * 2;

    this.container = scene.add
      .container(layout.x + layout.w / 2, layout.y + layout.h / 2)
      .setDepth(depth);

    this.container.add(createHubPanelGraphics(scene, layout.w, layout.h));
    const cornerGfx = scene.add.graphics();
    paintDuelFrameCorners(cornerGfx, -layout.w / 2, -layout.h / 2, layout.w, layout.h, 9);
    this.container.add(cornerGfx);

    this.container.add(
      scene.add.text(-layout.w / 2 + padX, -layout.h / 2 + 10, title, {
        fontFamily: FONT_DISPLAY,
        fontSize: "16px",
        color: COLORS.ember,
        letterSpacing: 2,
      }).setOrigin(0, 0),
    );

    this.body = scene.add.text(bodyX, this.bodyTop, "—", {
      fontFamily: FONT,
      fontSize: "15px",
      color: COLORS.bone,
      lineSpacing: 5,
      wordWrap: { width: this.viewW },
      fixedWidth: this.viewW,
    }).setOrigin(0, 0);

    const maskGfx = scene.make.graphics({});
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(bodyX, this.bodyTop, this.viewW, this.viewH);
    this.body.setMask(maskGfx.createGeometryMask());
    this.container.add(this.body);
  }

  /** Replace log lines; scrolls down when content exceeds the panel. */
  setLines(lines: string[]): void {
    const next = lines.length > 0 ? lines : ["—"];
    this.body.setText(next.join("\n"));

    const overflow = Math.max(0, this.body.height - this.viewH);
    this.body.setY(this.bodyTop - overflow);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

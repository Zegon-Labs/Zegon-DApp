import Phaser from "phaser";
import { t } from "../i18n/index.js";
import { C, COLORS, FONT } from "../ui/theme.js";
import { createMenuButton, drawScanlines } from "../ui/components.js";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    this.add.circle(width / 2, height * 0.28, 110, C.blood, 0.12);
    this.drawSilhouette(width / 2, height * 0.3);

    this.add
      .text(width / 2, height * 0.14, "ZEGON", {
        fontFamily: FONT,
        fontSize: "72px",
        color: COLORS.bone,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.22, strings.tagline, {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.ember,
      })
      .setOrigin(0.5);

    createMenuButton(this, width / 2, height * 0.48, strings.duel, () => {
      this.scene.start("DuelScene", { mode: "standard" });
    });

    createMenuButton(this, width / 2, height * 0.58, strings.daily, () => {
      this.scene.start("DuelScene", { mode: "daily" });
    });

    createMenuButton(this, width / 2, height * 0.68, strings.settings, () => {
      this.scene.start("SettingsScene");
    });

    this.add
      .text(width / 2, height - 24, strings.pressStart, {
        fontFamily: FONT,
        fontSize: "18px",
        color: COLORS.cyan,
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
  }

  private drawSilhouette(x: number, y: number): void {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x0a0911, 1);
    g.fillEllipse(x, y - 40, 80, 20);
    g.fillRect(x - 22, y - 58, 44, 24);
    g.fillRect(x - 18, y - 20, 36, 70);
    g.fillStyle(C.blood, 0.8);
    g.fillRect(x - 2, y - 28, 4, 30);
  }
}

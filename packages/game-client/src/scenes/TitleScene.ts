import Phaser from "phaser";
import { coverImage } from "../config/assets.js";
import { t } from "../i18n/index.js";

const UI = {
  color: {
    bone: "#E6E1D3",
    dust: "#9A93A8",
    cyan: "#2EE6D6",
    ember: "#FF4D2E",
  },
  font: "VT323, monospace",
};

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    coverImage(this, "menu_inicio");

    this.add
      .image(width / 2, height * 0.22, "logo")
      .setScale(Math.min(0.42, (width * 0.55) / 800))
      .setDepth(1);

    this.add
      .text(width / 2, height * 0.38, strings.tagline, {
        fontFamily: UI.font,
        fontSize: "22px",
        color: UI.color.ember,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.createMenuButton(width / 2, height * 0.52, strings.duel, () => {
      this.scene.start("DuelScene", { mode: "standard" });
    });

    this.createMenuButton(width / 2, height * 0.62, strings.daily, () => {
      this.scene.start("DuelScene", { mode: "daily" });
    });

    this.createMenuButton(width / 2, height * 0.72, strings.settings, () => {
      this.scene.start("SettingsScene");
    });

    this.add
      .text(width / 2, height - 28, strings.pressStart, {
        fontFamily: UI.font,
        fontSize: "18px",
        color: UI.color.cyan,
      })
      .setOrigin(0.5)
      .setAlpha(0.75)
      .setDepth(2);
  }

  private createMenuButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 280;
    const h = 44;
    const bg = this.add
      .rectangle(x, y, w, h, 0x8b0000, 0.85)
      .setStrokeStyle(2, 0xff4d2e)
      .setDepth(2);

    const text = this.add
      .text(x, y, label, {
        fontFamily: UI.font,
        fontSize: "28px",
        color: UI.color.bone,
      })
      .setOrigin(0.5)
      .setDepth(3);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      bg.setFillStyle(0xb3122b, 0.95);
      text.setColor(UI.color.cyan);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(0x8b0000, 0.85);
      text.setColor(UI.color.bone);
    });
    bg.on("pointerdown", onClick);

    return this.add.container(0, 0, [bg, text]);
  }
}

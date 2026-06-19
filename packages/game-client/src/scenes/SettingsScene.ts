import Phaser from "phaser";
import { getLanguage, setLanguage, t, type Language } from "../i18n/index.js";
import { createMenuButton, drawScanlines } from "../ui/components.js";
import { C, COLORS, FONT } from "../ui/theme.js";

export class SettingsScene extends Phaser.Scene {
  private savedText: Phaser.GameObjects.Text | null = null;
  private justSaved = false;

  constructor() {
    super("SettingsScene");
  }

  init(data: { saved?: boolean }): void {
    this.justSaved = data.saved ?? false;
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    const panel = this.add.rectangle(width / 2, height / 2, 380, 280, C.ash, 0.95);
    panel.setStrokeStyle(1, C.fog);

    this.add
      .text(width / 2, height / 2 - 100, strings.settingsTitle, {
        fontFamily: FONT,
        fontSize: "40px",
        color: COLORS.bone,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 50, strings.language, {
        fontFamily: FONT,
        fontSize: "22px",
        color: COLORS.dust,
      })
      .setOrigin(0.5);

    const current = getLanguage();
    this.createLangButton(width / 2 - 100, height / 2, "en", strings.languageEn, current === "en");
    this.createLangButton(width / 2 + 100, height / 2, "es", strings.languageEs, current === "es");

    this.savedText = this.add
      .text(width / 2, height / 2 + 50, "", {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.verified,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    createMenuButton(this, width / 2, height / 2 + 100, strings.back, () => {
      this.scene.start("TitleScene");
    });

    if (this.justSaved) this.showSaved();
  }

  private createLangButton(
    x: number,
    y: number,
    lang: Language,
    label: string,
    active: boolean,
  ): void {
    const w = 150;
    const h = 36;
    const bg = this.add.rectangle(x, y, w, h, C.smoke, 0.95);
    bg.setStrokeStyle(active ? 2 : 1, active ? C.cyan : C.fog);
    const text = this.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize: "22px",
      color: active ? COLORS.cyan : COLORS.bone,
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => {
      if (getLanguage() === lang) return;
      setLanguage(lang);
      this.scene.restart({ saved: true });
    });
    bg.on("pointerover", () => text.setColor(COLORS.cyan));
    bg.on("pointerout", () => text.setColor(getLanguage() === lang ? COLORS.cyan : COLORS.bone));
  }

  private showSaved(): void {
    if (!this.savedText) return;
    this.savedText.setText(t().saved).setAlpha(1);
    this.time.delayedCall(1200, () => this.savedText?.setAlpha(0));
  }
}

import Phaser from "phaser";
import { getLanguage, setLanguage, t, type Language } from "../i18n/index.js";

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

    this.add
      .text(width / 2, 60, strings.settingsTitle, {
        fontFamily: "VT323, monospace",
        fontSize: "48px",
        color: "#E6E1D3",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 130, strings.language, {
        fontFamily: "VT323, monospace",
        fontSize: "28px",
        color: "#9A93A8",
      })
      .setOrigin(0.5);

    const current = getLanguage();
    this.createLangButton(width / 2 - 120, 200, "en", strings.languageEn, current === "en");
    this.createLangButton(width / 2 + 120, 200, "es", strings.languageEs, current === "es");

    this.savedText = this.add
      .text(width / 2, 280, "", {
        fontFamily: "VT323, monospace",
        fontSize: "22px",
        color: "#4DF07A",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.createButton(width / 2, height - 80, strings.back, () => {
      this.scene.start("TitleScene");
    });

    if (this.justSaved) {
      this.showSaved();
    }
  }

  private createLangButton(
    x: number,
    y: number,
    lang: Language,
    label: string,
    active: boolean,
  ): void {
    const btn = this.add
      .text(x, y, `[ ${label} ]`, {
        fontFamily: "VT323, monospace",
        fontSize: "28px",
        color: active ? "#2EE6D6" : "#E6E1D3",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => {
      if (getLanguage() !== lang) btn.setColor("#2EE6D6");
    });
    btn.on("pointerout", () => {
      btn.setColor(getLanguage() === lang ? "#2EE6D6" : "#E6E1D3");
    });
    btn.on("pointerdown", () => {
      if (getLanguage() === lang) return;
      setLanguage(lang);
      this.scene.restart({ saved: true });
    });
  }

  private showSaved(): void {
    if (!this.savedText) return;
    this.savedText.setText(t().saved);
    this.savedText.setAlpha(1);
    this.time.delayedCall(1200, () => {
      this.savedText?.setAlpha(0);
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, `[ ${label} ]`, {
        fontFamily: "VT323, monospace",
        fontSize: "32px",
        color: "#E6E1D3",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#2EE6D6"));
    btn.on("pointerout", () => btn.setColor("#E6E1D3"));
    btn.on("pointerdown", onClick);
    return btn;
  }
}

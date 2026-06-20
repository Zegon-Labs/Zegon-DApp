import Phaser from "phaser";
import { getLanguage, setLanguage, t } from "../i18n/index.js";
import {
  createHubChoiceButton,
  createHubMenuButton,
  createHubScreenPanel,
} from "../ui/hub/index.js";
import { drawScanlines } from "../ui/components.js";
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

    createHubScreenPanel(this, width / 2, height / 2, 380, 280);

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
    createHubChoiceButton(this, width / 2 - 100, height / 2, strings.languageEn, current === "en", () => {
      if (getLanguage() === "en") return;
      setLanguage("en");
      this.scene.restart({ saved: true });
    });
    createHubChoiceButton(this, width / 2 + 100, height / 2, strings.languageEs, current === "es", () => {
      if (getLanguage() === "es") return;
      setLanguage("es");
      this.scene.restart({ saved: true });
    });

    this.savedText = this.add
      .text(width / 2, height / 2 + 50, "", {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.verified,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    createHubMenuButton(this, width / 2, height / 2 + 100, strings.back, () => {
      this.scene.start("TitleScene");
    });

    if (this.justSaved) this.showSaved();
  }

  private showSaved(): void {
    if (!this.savedText) return;
    this.savedText.setText(t().saved).setAlpha(1);
    this.time.delayedCall(1200, () => this.savedText?.setAlpha(0));
  }
}

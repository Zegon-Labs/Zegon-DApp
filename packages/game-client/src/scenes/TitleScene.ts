import Phaser from "phaser";
import { t } from "../i18n/index.js";
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
  truncateAddress,
} from "../services/wallet.js";
import { isTutorialDone } from "../tutorial/steps.js";
import { createHubAccentMenuButton, createHubMenuButton, addHubLogo, preloadHubLogo } from "../ui/hub/index.js";
import { playUiClick, playUiHover } from "../services/sfx.js";
import { createSmallButton, drawScanlines } from "../ui/components.js";
import { titleButtonY, TITLE_LAYOUT } from "../ui/layout.js";
import { C, COLORS, FONT } from "../ui/theme.js";

export class TitleScene extends Phaser.Scene {
  private walletText!: Phaser.GameObjects.Text;
  private walletHint!: Phaser.GameObjects.Text;
  private walletUnsub: (() => void) | null = null;

  constructor() {
    super("TitleScene");
  }

  preload(): void {
    preloadHubLogo(this);
  }

  create(): void {
    const { width } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    addHubLogo(this, width / 2, TITLE_LAYOUT.logoY, TITLE_LAYOUT.logoMaxW);

    this.add.text(width / 2, TITLE_LAYOUT.taglineY, strings.tagline, {
      fontFamily: FONT,
      fontSize: "17px",
      color: COLORS.ember,
    }).setOrigin(0.5);

    this.renderWalletUi();

    const tutorialLabel = isTutorialDone()
      ? `${strings.tutorial}  ${strings.tutorialDoneBadge}`
      : strings.tutorial;

    createHubAccentMenuButton(this, width / 2, titleButtonY(0), tutorialLabel, () => {
      this.scene.start("TutorialScene");
    });

    createHubMenuButton(this, width / 2, titleButtonY(1), strings.duel, () => {
      this.scene.start("DuelScene", { mode: "standard" });
    });

    createHubMenuButton(this, width / 2, titleButtonY(2), strings.daily, () => {
      this.scene.start("DuelScene", { mode: "daily" });
    });

    createHubMenuButton(this, width / 2, titleButtonY(3), strings.leaderboard, () => {
      this.scene.start("LeaderboardScene");
    });

    const settingsGear = this.add.text(width / 2, titleButtonY(4), "\u2699", {
      fontFamily: "Arial, sans-serif",
      fontSize: "34px",
      color: COLORS.ember,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    settingsGear
      .on("pointerover", () => {
        playUiHover();
        settingsGear.setColor(COLORS.blood);
      })
      .on("pointerout", () => settingsGear.setColor(COLORS.ember))
      .on("pointerdown", () => {
        playUiClick();
        this.scene.start("SettingsScene");
      });

    this.add.text(width / 2, TITLE_LAYOUT.footerY, strings.hubFooter, {
      fontFamily: FONT,
      fontSize: "11px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: width - 48 },
    }).setOrigin(0.5);

    const verifyLink = this.add.text(width / 2, TITLE_LAYOUT.linkY, strings.hubVerifyLink, {
      fontFamily: FONT,
      fontSize: "11px",
      color: COLORS.link,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    verifyLink.on("pointerover", () => verifyLink.setColor(COLORS.linkHover));
    verifyLink.on("pointerout", () => verifyLink.setColor(COLORS.link));
    verifyLink.on("pointerdown", () => window.open("/verify-guide.html", "_blank"));

    this.walletUnsub = onWalletChange(() => this.renderWalletUi());
  }

  private renderWalletUi(): void {
    this.walletText?.destroy();
    this.walletHint?.destroy();

    const strings = t();
    const { width } = this.scale;
    const address = getWalletAddress();

    if (address) {
      this.walletText = createSmallButton(
        this,
        width - 12,
        10,
        `${truncateAddress(address)}`,
        () => void disconnectWallet(),
      );
      this.walletHint = this.add.text(width - 12, 32, strings.disconnectWallet, {
        fontFamily: FONT,
        fontSize: "10px",
        color: COLORS.dust,
      }).setOrigin(1, 0);
    } else {
      this.walletText = createSmallButton(
        this,
        width - 12,
        10,
        strings.connectWallet,
        () => void this.handleConnect(),
      );
      this.walletHint = this.add.text(width - 12, 32, strings.walletOptional, {
        fontFamily: FONT,
        fontSize: "10px",
        color: COLORS.dust,
        align: "right",
        wordWrap: { width: 180 },
      }).setOrigin(1, 0);
    }
  }

  private async handleConnect(): Promise<void> {
    const strings = t();
    if (!hasEthereumProvider()) {
      this.walletHint?.setText(strings.walletNoProvider);
      return;
    }
    try {
      await connectWallet();
    } catch {
      this.walletHint?.setText(strings.walletNoProvider);
    }
  }

  shutdown(): void {
    this.walletUnsub?.();
    this.walletUnsub = null;
  }
}

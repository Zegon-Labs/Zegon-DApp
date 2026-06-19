import Phaser from "phaser";
import { coverImage } from "../config/assets.js";
import type { DuelResult } from "@zegon/game-core";
import { format, t } from "../i18n/index.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: { result: DuelResult }): void {
    const { width, height } = this.scale;
    const result = data.result;
    const strings = t();

    coverImage(this, "banner", 0);
    this.add.rectangle(0, 0, width, height, 0x0a0911, 0.72).setOrigin(0);

    const winnerLabel =
      result.winner === "PLAYER"
        ? strings.youWin
        : result.winner === "ZEGON"
          ? strings.zegonWins
          : strings.draw;

    this.add
      .image(width / 2, 90, "logo")
      .setScale(0.28)
      .setDepth(2);

    this.add
      .text(width / 2, 160, winnerLabel, {
        fontFamily: "VT323, monospace",
        fontSize: "48px",
        color: result.winner === "PLAYER" ? "#4DF07A" : "#FF4D2E",
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add.text(width / 2, 220, [
      `${strings.rounds}: ${result.roundsPlayed}`,
      `${strings.timesRead}: ${result.timesRead}`,
      `${strings.finalBlindsight}: ${result.finalBlindsight}%`,
      `${strings.score}: ${result.score}`,
    ].join("\n"), {
      fontFamily: "VT323, monospace",
      fontSize: "24px",
      color: "#E6E1D3",
      align: "center",
    }).setOrigin(0.5).setDepth(2);

    const verifyBtn = this.add
      .text(width / 2, height / 2 + 20, `[ ${strings.verifyOnChain} ]`, {
        fontFamily: "VT323, monospace",
        fontSize: "28px",
        color: "#2EE6D6",
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    verifyBtn.on("pointerover", () => verifyBtn.setColor("#4DF07A"));
    verifyBtn.on("pointerout", () => verifyBtn.setColor("#2EE6D6"));
    verifyBtn.on("pointerdown", () => {
      window.open("/api/duel/verify/demo", "_blank");
    });

    const shareBtn = this.add
      .text(width / 2, height / 2 + 80, `[ ${strings.share} ]`, {
        fontFamily: "VT323, monospace",
        fontSize: "28px",
        color: "#E6E1D3",
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    shareBtn.on("pointerdown", () => {
      const text = format(strings.shareText, {
        score: result.score,
        timesRead: result.timesRead,
      });
      void navigator.clipboard?.writeText(text);
      shareBtn.setText(`[ ${strings.copied} ]`);
    });

    const menuBtn = this.add
      .text(width / 2, height - 60, `[ ${strings.menu} ]`, {
        fontFamily: "VT323, monospace",
        fontSize: "24px",
        color: "#9A93A8",
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerdown", () => this.scene.start("TitleScene"));
  }
}

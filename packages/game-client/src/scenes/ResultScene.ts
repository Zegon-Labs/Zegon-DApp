import Phaser from "phaser";
import type { DuelResult } from "@zegon/game-core";
import { format, t } from "../i18n/index.js";
import { createMenuButton, drawScanlines } from "../ui/components.js";
import { C, COLORS, FONT } from "../ui/theme.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: { result: DuelResult }): void {
    const { width, height } = this.scale;
    const result = data.result;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    const panel = this.add.rectangle(width / 2, height / 2, 420, 340, C.ash, 0.95);
    panel.setStrokeStyle(1, C.fog);

    const winnerLabel =
      result.winner === "PLAYER"
        ? strings.youWin
        : result.winner === "ZEGON"
          ? strings.zegonWins
          : strings.draw;

    this.add
      .text(width / 2, height / 2 - 130, winnerLabel, {
        fontFamily: FONT,
        fontSize: "44px",
        color: result.winner === "PLAYER" ? COLORS.verified : COLORS.ember,
      })
      .setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 60, [
      `${strings.rounds}: ${result.roundsPlayed}`,
      `${strings.timesRead}: ${result.timesRead}`,
      `${strings.finalBlindsight}: ${result.finalBlindsight}%`,
      `${strings.score}: ${result.score}`,
    ].join("\n"), {
      fontFamily: FONT,
      fontSize: "22px",
      color: COLORS.bone,
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5);

    createMenuButton(this, width / 2, height / 2 + 30, strings.verifyOnChain, () => {
      window.open("/api/duel/verify/demo", "_blank");
    });

    createMenuButton(this, width / 2, height / 2 + 80, strings.share, () => {
      const text = format(strings.shareText, {
        score: result.score,
        timesRead: result.timesRead,
      });
      void navigator.clipboard?.writeText(text);
    });

    createMenuButton(this, width / 2, height / 2 + 130, strings.menu, () => {
      this.scene.start("TitleScene");
    });
  }
}

import Phaser from "phaser";
import { format, t } from "../i18n/index.js";
import { createMenuButton, drawScanlines } from "../ui/components.js";
import { C, COLORS, FONT } from "../ui/theme.js";

interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: number;
}

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    const panel = this.add.rectangle(width / 2, height / 2, 480, 360, C.ash, 0.95);
    panel.setStrokeStyle(1, C.fog);

    this.add.text(width / 2, height / 2 - 150, strings.leaderboardTitle, {
      fontFamily: FONT,
      fontSize: "32px",
      color: COLORS.ember,
    }).setOrigin(0.5);

    const body = this.add.text(width / 2, height / 2 - 20, strings.leaderboardEmpty, {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.bone,
      align: "center",
      lineSpacing: 8,
    }).setOrigin(0.5);

    createMenuButton(this, width / 2, height / 2 + 130, strings.back, () => {
      this.scene.start("TitleScene");
    });

    void this.loadLeaderboard(body);
  }

  private async loadLeaderboard(body: Phaser.GameObjects.Text): Promise<void> {
    const strings = t();
    try {
      const res = await fetch("/api/daily/leaderboard");
      if (!res.ok) throw new Error("offline");
      const data = (await res.json()) as { entries: LeaderboardEntry[] };
      const entries = data.entries.slice(0, 10);

      if (entries.length === 0) {
        body.setText(strings.leaderboardEmpty);
        return;
      }

      body.setText(
        entries
          .map((e, i) =>
            format(strings.leaderboardRank, {
              rank: i + 1,
              id: `${e.playerId.slice(0, 6)}…${e.playerId.slice(-4)}`,
              score: e.score,
            }),
          )
          .join("\n"),
      );
    } catch {
      body.setText(strings.leaderboardEmpty + "\n\n(server offline)");
    }
  }
}

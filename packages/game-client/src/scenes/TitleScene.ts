import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 3, "ZEGON", {
        fontFamily: "VT323, monospace",
        fontSize: "96px",
        color: "#E6E1D3",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 3 + 60, "Outdraw the Blind", {
        fontFamily: "VT323, monospace",
        fontSize: "24px",
        color: "#9A93A8",
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height / 2 + 40, "DUEL", () => {
      this.scene.start("DuelScene", { mode: "standard" });
    });

    this.createButton(width / 2, height / 2 + 100, "DAILY", () => {
      this.scene.start("DuelScene", { mode: "daily" });
    });

    this.add
      .text(width / 2, height - 40, "PRESS START", {
        fontFamily: "VT323, monospace",
        fontSize: "20px",
        color: "#2EE6D6",
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
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

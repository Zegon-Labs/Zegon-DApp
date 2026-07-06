import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L, blindsightPanelX } from "../layout.js";
import { drawStreakMeter, paintDuelFrameCorners } from "./duelHudDraw.js";

/** Top-right read-streak panel — 2 ticks, no percentage. */
export class BlindsightMeter {
  readonly container: Phaser.GameObjects.Container;
  private readonly panelGfx: Phaser.GameObjects.Graphics;
  private readonly meterGfx: Phaser.GameObjects.Graphics;
  private readonly cornerGfx: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly flavor: Phaser.GameObjects.Text;
  private readonly nextHint: Phaser.GameObjects.Text;
  private readonly panelW = L.blindsight.panelW;
  private readonly panelH = L.blindsight.panelH;
  private readonly panelX: number;
  private readonly panelY = L.blindsight.panelY;
  private readonly streakSegments = 2;

  constructor(scene: Phaser.Scene, depth = 9) {
    const { width } = scene.scale;
    this.panelX = blindsightPanelX(width);

    this.container = scene.add.container(0, 0).setDepth(depth);
    this.panelGfx = scene.add.graphics();
    this.cornerGfx = scene.add.graphics();
    this.meterGfx = scene.add.graphics();

    const pad = L.blindsight.pad;
    const innerX = this.panelX + pad;
    const innerW = this.panelW - pad * 2;
    const barY = this.panelY + pad + 20;

    this.title = scene.add.text(innerX, this.panelY + pad, "BLINDSIGHT", {
      fontFamily: FONT_DISPLAY,
      fontSize: "14px",
      color: COLORS.ember,
      letterSpacing: 2,
    }).setOrigin(0, 0);

    this.flavor = scene.add.text(innerX, barY + L.blindsight.barH + 22, "", {
      fontFamily: FONT,
      fontSize: "13px",
      color: COLORS.dust,
      wordWrap: { width: innerW },
      lineSpacing: 2,
    }).setOrigin(0, 0);

    this.nextHint = scene.add.text(innerX, this.panelY + this.panelH - pad - 16, "", {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.bone,
      letterSpacing: 1,
    }).setOrigin(0, 0);

    this.container.add([
      this.panelGfx,
      this.cornerGfx,
      this.meterGfx,
      this.title,
      this.flavor,
      this.nextHint,
    ]);

    this.redrawPanel();
  }

  private redrawPanel(): void {
    this.panelGfx.clear();
    this.panelGfx.fillStyle(C.ash, 0.92);
    this.panelGfx.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);
    this.panelGfx.lineStyle(1, C.blood, 0.8);
    this.panelGfx.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);
    this.cornerGfx.clear();
    paintDuelFrameCorners(
      this.cornerGfx,
      this.panelX,
      this.panelY,
      this.panelW,
      this.panelH,
      7,
    );
  }

  update(
    label: string,
    readingStreak: number,
    _deadeyeStreak: number,
    flavorText: string,
    nextHint: string,
  ): void {
    this.title.setText(label);
    this.flavor.setText(flavorText);
    this.nextHint.setText(nextHint);

    const pad = L.blindsight.pad;
    const barX = this.panelX + pad;
    const barY = this.panelY + pad + 20;
    const barW = this.panelW - pad * 2;
    drawStreakMeter(
      this.meterGfx,
      barX,
      barY,
      barW,
      L.blindsight.barH,
      readingStreak,
      this.streakSegments,
    );

    const hot = readingStreak > 0;
    this.panelGfx.clear();
    this.panelGfx.fillStyle(C.ash, 0.92);
    this.panelGfx.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);
    this.panelGfx.lineStyle(hot ? 1.5 : 1, C.blood, hot ? 0.95 : 0.8);
    this.panelGfx.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);
    this.cornerGfx.clear();
    paintDuelFrameCorners(
      this.cornerGfx,
      this.panelX,
      this.panelY,
      this.panelW,
      this.panelH,
      7,
    );
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

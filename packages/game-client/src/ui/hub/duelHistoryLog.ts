import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { paintHubPanel } from "./hubPanel.js";
import { paintDuelFrameCorners } from "./duelHudDraw.js";

const ROW_H = 22;
const TITLE_H = 32;
const PAD = 14;
const MIN_BODY_ROWS = 2;
const MAX_BODY_ROWS = 7;

/** Hub-style action history — grows with entries, scrolls inside when full. */
export class DuelHistoryLog {
  readonly container: Phaser.GameObjects.Container;
  private readonly panelGfx: Phaser.GameObjects.Graphics;
  private readonly cornerGfx: Phaser.GameObjects.Graphics;
  private readonly scrollLayer: Phaser.GameObjects.Container;
  private readonly maskGfx: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private panelW: number;
  private panelH: number;
  private bodyTop = 0;
  private viewH = 0;
  private entryTexts: Phaser.GameObjects.Text[] = [];

  constructor(
    scene: Phaser.Scene,
    title: string,
    depth = 12,
    layout = L.history,
  ) {
    this.panelW = layout.w;
    this.panelH = this.computePanelHeight(MIN_BODY_ROWS);
    this.anchorX = layout.x;
    this.anchorY = layout.y;
    this.bodyTop = -this.panelH / 2 + TITLE_H + 8;
    this.viewH = this.panelH - TITLE_H - PAD * 2;

    this.container = scene.add.container(this.anchorX, this.anchorY).setDepth(depth);

    this.panelGfx = scene.add.graphics();
    this.cornerGfx = scene.add.graphics();
    this.scrollLayer = scene.add.container(-this.panelW / 2 + PAD, this.bodyTop);
    this.maskGfx = scene.add.graphics();

    this.titleText = scene.add.text(-this.panelW / 2 + PAD, -this.panelH / 2 + 10, title, {
      fontFamily: FONT_DISPLAY,
      fontSize: "16px",
      color: COLORS.ember,
      letterSpacing: 2,
    }).setOrigin(0, 0);

    this.container.add([
      this.panelGfx,
      this.cornerGfx,
      this.scrollLayer,
      this.titleText,
    ]);

    this.redrawPanel();
    this.applyMask();
    this.setLines([]);
  }

  private computePanelHeight(rowCount: number): number {
    const rows = Math.max(MIN_BODY_ROWS, Math.min(MAX_BODY_ROWS, rowCount));
    return TITLE_H + rows * ROW_H + PAD * 2;
  }

  private redrawPanel(): void {
    this.panelGfx.clear();
    paintHubPanel(this.panelGfx, this.panelW, this.panelH);
    this.cornerGfx.clear();
    paintDuelFrameCorners(
      this.cornerGfx,
      -this.panelW / 2,
      -this.panelH / 2,
      this.panelW,
      this.panelH,
      9,
    );
    this.titleText.setY(-this.panelH / 2 + 10);
    this.bodyTop = -this.panelH / 2 + TITLE_H + 8;
    this.viewH = this.panelH - TITLE_H - PAD * 2;
    this.scrollLayer.setPosition(-this.panelW / 2 + PAD, this.bodyTop);
  }

  private applyMask(): void {
    this.maskGfx.clear();
    this.maskGfx.fillStyle(0xffffff);
    this.maskGfx.fillRect(
      -this.panelW / 2 + PAD,
      this.bodyTop,
      this.panelW - PAD * 2,
      this.viewH,
    );
    this.scrollLayer.setMask(this.maskGfx.createGeometryMask());
    if (!this.container.list.includes(this.maskGfx)) {
      this.container.add(this.maskGfx);
    }
    this.maskGfx.setVisible(false);
  }

  setLines(lines: string[]): void {
    const next = lines.length > 0 ? lines : ["—"];
    const targetRows =
      next.length <= MIN_BODY_ROWS
        ? MIN_BODY_ROWS
        : Math.min(MAX_BODY_ROWS, next.length);
    const nextPanelH = this.computePanelHeight(targetRows);

    if (nextPanelH !== this.panelH) {
      this.panelH = nextPanelH;
      this.redrawPanel();
      this.applyMask();
    }

    for (const entry of this.entryTexts) {
      entry.destroy();
    }
    this.entryTexts = [];

    const scene = this.container.scene;
    next.forEach((line, index) => {
      const entry = scene.add.text(0, index * ROW_H, line, {
        fontFamily: FONT,
        fontSize: "14px",
        color: index === next.length - 1 ? COLORS.ember : COLORS.bone,
        letterSpacing: 0.8,
      }).setOrigin(0, 0);
      this.scrollLayer.add(entry);
      this.entryTexts.push(entry);
    });

    const contentH = next.length * ROW_H;
    const overflow = Math.max(0, contentH - this.viewH);
    this.scrollLayer.setY(this.bodyTop - overflow);
  }

  destroy(): void {
    for (const entry of this.entryTexts) {
      entry.destroy();
    }
    this.entryTexts = [];
    this.container.destroy(true);
  }
}

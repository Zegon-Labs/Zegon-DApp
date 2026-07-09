import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { C, COLORS, FONT_DISPLAY } from "../theme.js";

export const HISTORY_PANEL_KEY = "history-panel";
const HISTORY_PANEL_PATH = "/sprites/historial_panel.png";
const HISTORY_PANEL_SRC_W = 1086;
const HISTORY_PANEL_SRC_H = 1448;

const ROW_H = 26;
const PAD = 52;
const HEADER_H = 84;
const BODY_TOP = HEADER_H + 10;
const HEADER_TEXT_Y = 56;
const PIP_SLOTS = 9;
const SCROLLBAR_W = 5;
const SCROLLBAR_GAP = 6;

export function preloadHistoryPanel(scene: Phaser.Scene): void {
  if (scene.textures.exists(HISTORY_PANEL_KEY)) return;
  scene.load.image(HISTORY_PANEL_KEY, HISTORY_PANEL_PATH);
}

export interface DuelHistoryLogState {
  roundLabel: string;
  roundIndex: number;
  lines: string[];
}

/** Hub-style action history — fixed height, scrollable body + red scrollbar. */
export class DuelHistoryLog {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly panelImage: Phaser.GameObjects.Image;
  private readonly headerBg: Phaser.GameObjects.Graphics;
  private readonly headerDivider: Phaser.GameObjects.Graphics;
  private readonly pipsGfx: Phaser.GameObjects.Graphics;
  private readonly scrollbarGfx: Phaser.GameObjects.Graphics;
  private readonly bodyPanel: Phaser.GameObjects.Container;
  private readonly scrollLayer: Phaser.GameObjects.Container;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly headerText: Phaser.GameObjects.Text;
  private readonly scrollHit: Phaser.GameObjects.Rectangle;
  private readonly panelW: number;
  private readonly panelH: number;
  private readonly contentW: number;
  private readonly viewH: number;
  private readonly bodyTop = BODY_TOP;
  private readonly anchorX: number;
  private readonly anchorY: number;
  private entryTexts: Phaser.GameObjects.Text[] = [];
  private historyTitle: string;
  private lastRoundLabel = "";
  private scrollOffset = 0;
  private maxScroll = 0;
  private prevLineCount = 0;
  private lines: string[] = [];
  private stickToBottom = true;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private dragging = false;
  private geometryMask: Phaser.Display.Masks.GeometryMask | null = null;

  private readonly wheelHandler = (
    pointer: Phaser.Input.Pointer,
    _currentlyOver: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
    event: WheelEvent,
  ) => {
    if (this.maxScroll <= 0) return;
    if (!this.isPointerInBody(pointer)) return;
    this.scrollBy(deltaY * 0.5);
    event.preventDefault();
    event.stopPropagation();
  };

  constructor(
    scene: Phaser.Scene,
    historyTitle: string,
    depth = 12,
    layout: { x: number; y: number; w: number; visibleRows?: number; pipGap?: number; pipSize?: number } = L.history,
  ) {
    this.scene = scene;
    this.historyTitle = historyTitle;
    this.panelW = layout.w;
    this.anchorX = layout.x;
    this.anchorY = layout.y;
    const visibleRows = layout.visibleRows ?? 6;
    const decorativeH = Math.round(
      this.panelW * (HISTORY_PANEL_SRC_H / HISTORY_PANEL_SRC_W),
    );
    this.panelH = Math.max(BODY_TOP + visibleRows * ROW_H + PAD, decorativeH);
    this.viewH = this.panelH - this.bodyTop - PAD;
    this.contentW = this.panelW - PAD * 2 - SCROLLBAR_GAP - SCROLLBAR_W;

    this.container = scene.add.container(layout.x, layout.y).setDepth(depth);

    this.panelImage = scene.add
      .image(0, 0, HISTORY_PANEL_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(this.panelW, this.panelH);
    this.headerBg = scene.add.graphics();
    this.headerDivider = scene.add.graphics();
    this.pipsGfx = scene.add.graphics();
    this.scrollbarGfx = scene.add.graphics();
    this.bodyPanel = scene.add.container(PAD, this.bodyTop);
    this.scrollLayer = scene.add.container(0, 0);
    this.bodyPanel.add(this.scrollLayer);

    this.maskShape = scene.add.graphics();
    this.geometryMask = this.maskShape.createGeometryMask();
    this.bodyPanel.setMask(this.geometryMask);

    this.headerText = scene.add.text(PAD, HEADER_TEXT_Y, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "17px",
      color: COLORS.ember,
      letterSpacing: 1.5,
    }).setOrigin(0, 0);

    this.scrollHit = scene.add
      .rectangle(
        PAD + this.contentW / 2,
        this.bodyTop + this.viewH / 2,
        this.contentW + SCROLLBAR_GAP + SCROLLBAR_W,
        this.viewH,
        0xffffff,
        0.001,
      )
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: false });

    this.scrollHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.maxScroll <= 0) return;
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.dragStartOffset = this.scrollOffset;
    });
    this.scrollHit.on("pointerup", () => {
      this.dragging = false;
    });
    this.scrollHit.on("pointerout", () => {
      this.dragging = false;
    });
    this.scrollHit.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging || !pointer.isDown || this.maxScroll <= 0) return;
      const delta = pointer.y - this.dragStartY;
      this.scrollOffset = Phaser.Math.Clamp(
        this.dragStartOffset - delta,
        0,
        this.maxScroll,
      );
      this.stickToBottom = this.scrollOffset >= this.maxScroll - 2;
      this.renderEntries(this.lines);
      this.drawScrollbar();
    });

    scene.input.on("wheel", this.wheelHandler);

    this.container.add([
      this.panelImage,
      this.bodyPanel,
      this.scrollbarGfx,
      this.headerBg,
      this.headerDivider,
      this.pipsGfx,
      this.headerText,
      this.scrollHit,
    ]);

    this.redrawPanel();
    this.applyBodyMask();
    this.update({ roundLabel: "", roundIndex: 0, lines: [] });
  }

  private isPointerInBody(pointer: Phaser.Input.Pointer): boolean {
    const bounds = this.scrollHit.getBounds();
    return bounds.contains(pointer.x, pointer.y);
  }

  private bodyWorldRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.anchorX + PAD,
      this.anchorY + this.bodyTop,
      this.contentW + SCROLLBAR_GAP + SCROLLBAR_W,
      this.viewH,
    );
  }

  private applyBodyMask(): void {
    const rect = this.bodyWorldRect();
    this.maskShape.clear();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  private redrawPanel(): void {
    this.headerBg.clear();
    this.headerBg.fillStyle(C.ash, 0);

    this.headerDivider.clear();
    this.headerDivider.lineStyle(1, C.blood, 0.42);
    this.headerDivider.lineBetween(PAD, HEADER_H, this.panelW - PAD - 8, HEADER_H);
  }

  private scrollBy(delta: number): void {
    if (this.maxScroll <= 0) return;
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + delta, 0, this.maxScroll);
    this.stickToBottom = this.scrollOffset >= this.maxScroll - 2;
    this.renderEntries(this.lines);
    this.drawScrollbar();
  }

  private drawScrollbar(): void {
    this.scrollbarGfx.clear();
  }

  private drawPips(roundIndex: number): void {
    const g = this.pipsGfx;
    g.clear();
    const pipSize = L.history.pipSize;
    const pipGap = L.history.pipGap;
    const filledCount = Math.min(roundIndex + 1, PIP_SLOTS);
    const currentSlot = roundIndex < PIP_SLOTS ? roundIndex : PIP_SLOTS - 1;
    const y = HEADER_H - pipSize - 2;

    for (let i = 0; i < PIP_SLOTS; i++) {
      const cx = PAD + i * (pipSize + pipGap) + pipSize / 2;
      const cy = y + pipSize / 2;
      const filled = i < filledCount;
      g.fillStyle(filled ? C.blood : C.fog, filled ? (i === currentSlot ? 1 : 0.55) : 0.35);
      g.fillCircle(cx, cy, pipSize / 2 - 1);
      if (i === currentSlot) {
        g.lineStyle(1, C.ember, 0.9);
        g.strokeCircle(cx, cy, pipSize / 2);
      }
    }
  }

  private renderEntries(lines: string[]): void {
    for (const entry of this.entryTexts) {
      entry.destroy();
    }
    this.entryTexts = [];

    lines.forEach((line, index) => {
      const entry = this.scene.add.text(0, index * ROW_H - this.scrollOffset, line, {
        fontFamily: FONT_DISPLAY,
        fontSize: "15px",
        color: index === lines.length - 1 ? COLORS.ember : COLORS.bone,
        letterSpacing: 0.6,
      }).setOrigin(0, 0);
      this.scrollLayer.add(entry);
      this.entryTexts.push(entry);
    });
  }

  update(state: DuelHistoryLogState): void {
    const roundPart = state.roundLabel.trim();
    const titlePart = this.historyTitle.toUpperCase();
    this.lastRoundLabel = roundPart;
    this.headerText.setText(
      roundPart ? `${roundPart} · ${titlePart}` : titlePart,
    );
    this.drawPips(state.roundIndex);

    const next = state.lines.length > 0 ? state.lines : ["—"];
    this.lines = next;
    const contentH = next.length * ROW_H;
    this.maxScroll = Math.max(0, contentH - this.viewH);

    const addedLines = next.length > this.prevLineCount;
    this.prevLineCount = next.length;

    if (addedLines || this.stickToBottom) {
      this.scrollOffset = this.maxScroll;
      this.stickToBottom = true;
    } else {
      this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);
    }

    this.renderEntries(next);
    this.drawScrollbar();
  }

  /** @deprecated Use update() */
  setLines(lines: string[]): void {
    this.update({ roundLabel: "", roundIndex: 0, lines });
  }

  setTitle(title: string): void {
    this.historyTitle = title;
    const titlePart = title.toUpperCase();
    this.headerText.setText(
      this.lastRoundLabel ? `${this.lastRoundLabel} · ${titlePart}` : titlePart,
    );
  }

  get panelHeight(): number {
    return this.panelH;
  }

  get panelWidth(): number {
    return this.panelW;
  }

  destroy(): void {
    this.scene.input.off("wheel", this.wheelHandler);
    for (const entry of this.entryTexts) {
      entry.destroy();
    }
    this.entryTexts = [];
    this.geometryMask?.destroy();
    this.maskShape.destroy();
    this.scrollHit.destroy();
    this.container.destroy(true);
  }
}

import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L, zegonStatsPanelX } from "../layout.js";
import { paintDuelFrameCorners } from "./duelHudDraw.js";
import {
  drawHeartIcon,
  drawSkullIcon,
} from "./duelHudDraw.js";

export interface FighterHudBlockState {
  name: string;
  hp: number;
  maxHp?: number;
  itemLabel?: string;
  itemDetail?: string;
  itemReady?: boolean;
  weaponLabel?: string;
  statusLabel?: string;
  detail?: string;
}

export interface FighterHudBlockOptions {
  align: "left" | "right";
  variant: "player" | "zegon";
  depth?: number;
}

const HEART_SLOTS = 5;

/** Bottom-corner fighter panel with hub-style box. */
export class FighterHudBlock {
  readonly container: Phaser.GameObjects.Container;
  private readonly iconGfx: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly metaText: Phaser.GameObjects.Text;
  private readonly panelX: number;
  private readonly panelY = L.stats.y;
  private readonly panelW = L.stats.panelW;
  private readonly panelH = L.stats.panelH;
  private readonly variant: "player" | "zegon";
  private readonly iconSize = L.stats.iconSize;
  private readonly iconGap = L.stats.iconGap;
  private readonly pad = L.stats.pad;

  constructor(scene: Phaser.Scene, options: FighterHudBlockOptions) {
    this.variant = options.variant;
    const depth = options.depth ?? 9;
    const { width } = scene.scale;
    this.panelX =
      options.align === "left"
        ? L.stats.playerX
        : zegonStatsPanelX(width);

    this.container = scene.add.container(0, 0).setDepth(depth);

    const panelGfx = scene.add.graphics();
    panelGfx.fillStyle(C.ash, 0.92);
    panelGfx.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);
    panelGfx.lineStyle(1, C.blood, 0.8);
    panelGfx.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 3);

    const cornerGfx = scene.add.graphics();
    paintDuelFrameCorners(
      cornerGfx,
      this.panelX,
      this.panelY,
      this.panelW,
      this.panelH,
      7,
    );

    this.iconGfx = scene.add.graphics();
    const nameOrigin = options.align === "left" ? 0 : 1;
    const nameX =
      options.align === "left"
        ? this.panelX + this.pad
        : this.panelX + this.panelW - this.pad;

    this.nameText = scene.add.text(nameX, this.panelY + this.pad, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "15px",
      color: COLORS.bone,
      letterSpacing: 2,
    }).setOrigin(nameOrigin, 0);

    this.metaText = scene.add.text(nameX, this.panelY + this.panelH - this.pad - 18, "", {
      fontFamily: FONT,
      fontSize: "13px",
      color: COLORS.ember,
      letterSpacing: 1,
      wordWrap: { width: this.panelW - this.pad * 2 },
    }).setOrigin(nameOrigin, 0);

    this.container.add([panelGfx, cornerGfx, this.iconGfx, this.nameText, this.metaText]);
  }

  private hpSlots(hp: number, maxHp: number): number {
    if (hp <= 0) return 0;
    return Math.max(1, Math.ceil((hp / maxHp) * HEART_SLOTS));
  }

  update(state: FighterHudBlockState): void {
    const maxHp = state.maxHp ?? 100;
    this.nameText.setText(state.name.toUpperCase());
    this.iconGfx.clear();

    const rowY = this.panelY + this.pad + L.stats.nameRowH;
    const filledHp = this.hpSlots(state.hp, maxHp);
    const leftEdge = this.panelX + this.pad + this.iconSize / 2;

    if (this.variant === "player") {
      for (let i = 0; i < HEART_SLOTS; i++) {
        const cx = leftEdge + i * (this.iconSize + this.iconGap);
        drawHeartIcon(this.iconGfx, cx, rowY, this.iconSize, i < filledHp);
      }
      const item = state.itemLabel?.trim();
      const detail = state.itemDetail?.trim();
      if (item && detail) {
        this.metaText.setText(`${item} · ${detail}`);
        this.metaText.setColor(state.itemReady ? COLORS.verified : COLORS.ember);
      } else if (detail) {
        this.metaText.setText(detail);
        this.metaText.setColor(state.itemReady ? COLORS.verified : COLORS.ember);
      } else {
        this.metaText.setText("");
      }
    } else {
      const rightEdge = this.panelX + this.panelW - this.pad - this.iconSize / 2;
      for (let i = 0; i < HEART_SLOTS; i++) {
        const cx = rightEdge - (HEART_SLOTS - 1 - i) * (this.iconSize + this.iconGap);
        drawSkullIcon(this.iconGfx, cx, rowY, this.iconSize, i < filledHp);
      }
      if (state.statusLabel) {
        this.metaText.setText(`${state.detail ?? "STATUS"} ${state.statusLabel}`);
      } else {
        this.metaText.setText("");
      }
    }
  }

  playLifeLost(previousHp: number, newHp: number, maxHp: number): void {
    const prevFilled = this.hpSlots(previousHp, maxHp);
    const nextFilled = this.hpSlots(newHp, maxHp);
    if (nextFilled >= prevFilled) return;

    const lostIndex = prevFilled - 1;
    const leftEdge = this.panelX + this.pad + this.iconSize / 2;
    const rightEdge = this.panelX + this.panelW - this.pad - this.iconSize / 2;
    const rowY = this.panelY + this.pad + L.stats.nameRowH;
    const cx =
      this.variant === "player"
        ? leftEdge + lostIndex * (this.iconSize + this.iconGap)
        : rightEdge - (HEART_SLOTS - 1 - lostIndex) * (this.iconSize + this.iconGap);

    const flash = this.container.scene.add.circle(cx, rowY, this.iconSize * 0.55, C.blood, 0.85);
    flash.setDepth(this.container.depth + 1);
    this.container.scene.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });
  }

  hpBarCenterY(): number {
    return this.panelY + this.pad + L.stats.nameRowH;
  }

  hpBarCenterX(): number {
    return this.panelX + this.panelW / 2;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

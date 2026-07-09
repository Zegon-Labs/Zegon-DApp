import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { preloadZegonDamagePortrait } from "./zegonDamagePortrait.js";

// ── Asset keys ─────────────────────────────────────────────────────────────
export const SIDE_BAR_KEY        = "side-bar";
export const SIDE_BAR_RIGHT_KEY  = "side-bar-right";
export const PLAYER_PORTRAIT_KEY = "player-portrait";
export const ZEGON_PORTRAIT_KEY  = "zegon-portrait";

export function preloadSideHudPanels(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SIDE_BAR_KEY))
    scene.load.image(SIDE_BAR_KEY, "/sprites/side_bar.png");
  if (!scene.textures.exists(SIDE_BAR_RIGHT_KEY))
    scene.load.image(SIDE_BAR_RIGHT_KEY, "/sprites/side_bar_right.png");
  if (!scene.textures.exists(PLAYER_PORTRAIT_KEY))
    scene.load.image(PLAYER_PORTRAIT_KEY, "/sprites/figura_sin_fondo_v2.png");
  if (!scene.textures.exists(ZEGON_PORTRAIT_KEY))
    scene.load.image(ZEGON_PORTRAIT_KEY, "/sprites/zegon_caracter.png");
  preloadZegonDamagePortrait(scene);
}

// ── Source layout (pixel-analysed, both PNGs 3072 × 512) ──────────────────
const SRC_W = 3072;
const SRC_H = 512;

// Fixed display width for BOTH panels — ensures they look the same size
// Both images display at PANEL_DISPLAY_W × panelH regardless of SRC_W:SRC_H ratio
const PANEL_DISPLAY_W = 408;

// LEFT panel (side_bar.png):  portrait frame LEFT, bar extends RIGHT
const L_ZONE_A_W   = 480;   // portrait frame width in source
const L_BAR_X0     = 580;   // bar zone start (source x) — past portrait border
const L_BAR_X1     = 2680;  // bar zone end   (source x) — before diagonal taper

// RIGHT panel (side_bar_right.png): portrait frame RIGHT, bar extends LEFT
const R_ZONE_A_X   = 2592;  // portrait frame start (source x)
const R_ZONE_A_W   = 480;   // portrait frame width in source
const R_BAR_X0     = 450;   // bar zone start (source x) — past diagonal left tip
const R_BAR_X1     = 2500;  // bar zone end   (source x) — before portrait border

// Thin bar height in screen pixels (centered vertically within the panel)
const BAR_H_PX = 20;

// ── Options ─────────────────────────────────────────────────────────────────
export interface SideHudPanelOptions {
  side: "left" | "right";
  /** Left panel: left edge X.  Right panel: right edge X (= screen width). */
  x: number;
  y: number;
  panelH?: number;
  depth?: number;
  /** Optional hits label under the bar (player upgrades). */
  showHitsSubtitle?: boolean;
  /** Live duel score under the HP bar (ZEGON panel). */
  showLiveScore?: boolean;
}

// ── Class ───────────────────────────────────────────────────────────────────
export class SideHudPanel {
  private readonly scene: Phaser.Scene;
  private readonly objs: Phaser.GameObjects.GameObject[] = [];

  // HP bar bounds (absolute screen coords)
  private readonly barX: number;
  private readonly barY: number;
  private readonly barW: number;
  private readonly barH: number;
  private readonly hpGfx: Phaser.GameObjects.Graphics;
  private readonly subtitleText: Phaser.GameObjects.Text | null;
  private readonly showSubtitle: boolean;
  private readonly scoreLabelText: Phaser.GameObjects.Text | null;
  private readonly scoreValueText: Phaser.GameObjects.Text | null;
  private readonly showLiveScore: boolean;
  private displayedScore = 0;

  constructor(scene: Phaser.Scene, opts: SideHudPanelOptions) {
    this.scene = scene;

    const depth   = opts.depth ?? 9;
    const panelH  = opts.panelH ?? 80;
    this.showSubtitle = Boolean(opts.showHitsSubtitle);
    this.showLiveScore = Boolean(opts.showLiveScore);

    // Both panels use the SAME fixed display width so they look identical in size.
    // scaleX compresses/stretches the image to PANEL_DISPLAY_W; scaleY sets the height.
    const scaleX  = PANEL_DISPLAY_W / SRC_W;  // 440 / 3072 ≈ 0.1432
    const scaleY  = panelH          / SRC_H;  // 80  / 512  = 0.15625

    // ── Panel image ──────────────────────────────────────────────────────────
    // LEFT  panel: origin (0,0) at opts.x → image grows rightward
    // RIGHT panel: origin (1,0) at opts.x → image grows leftward
    const imgKey  = opts.side === "left" ? SIDE_BAR_KEY : SIDE_BAR_RIGHT_KEY;
    const originX = opts.side === "left" ? 0 : 1;

    if (scene.textures.exists(imgKey)) {
      scene.add
        .image(opts.x, opts.y, imgKey)
        .setOrigin(originX, 0)
        .setScale(scaleX, scaleY)
        .setDepth(depth);
    }

    // Left edge of the image in screen space (used for all content placement)
    const imgLeft = opts.side === "left"
      ? opts.x
      : opts.x - SRC_W * scaleX;  // = width - PANEL_DISPLAY_W

    // ── Portrait ─────────────────────────────────────────────────────────────
    const zoneASrcX    = opts.side === "left" ? 0          : R_ZONE_A_X;
    const zoneASrcW    = opts.side === "left" ? L_ZONE_A_W : R_ZONE_A_W;
    const zoneALeft    = imgLeft + zoneASrcX  * scaleX;
    const zoneAScreenW = zoneASrcW * scaleX;
    const zoneACX      = zoneALeft + zoneAScreenW / 2;
    const zoneACY      = opts.y + panelH / 2;

    const portraitKey = opts.side === "left" ? PLAYER_PORTRAIT_KEY : ZEGON_PORTRAIT_KEY;
    if (scene.textures.exists(portraitKey)) {
      const portrait = scene.add
        .image(zoneACX, zoneACY, portraitKey)
        .setOrigin(0.5, 0.5)
        .setDepth(depth + 1);
      portrait.setScale(Math.min(
        (zoneAScreenW * 0.88) / portrait.width,
        (panelH       * 0.88) / portrait.height,
      ));
      this.objs.push(portrait);
    }

    // ── HP bar geometry ───────────────────────────────────────────────────────
    // X: derived from source zone, using scaleX
    // Y: fixed height (BAR_H_PX), centered vertically in the panel
    const barSrcX0 = opts.side === "left" ? L_BAR_X0 : R_BAR_X0;
    const barSrcX1 = opts.side === "left" ? L_BAR_X1 : R_BAR_X1;

    this.barX = Math.round(imgLeft + barSrcX0 * scaleX);
    this.barW = Math.round((barSrcX1 - barSrcX0) * scaleX);
    this.barH = BAR_H_PX;
    this.barY = Math.round(opts.y + (panelH - this.barH) / 2);  // centered

    this.hpGfx = scene.add.graphics().setDepth(depth + 2);
    this.objs.push(this.hpGfx);
    this.drawSegments(0, 1);

    if (this.showSubtitle) {
      this.subtitleText = scene.add
        .text(this.barX + this.barW / 2, this.barY + this.barH + 6, "", {
          fontFamily: "VT323, monospace",
          fontSize: "14px",
          color: "#9a8f82",
        })
        .setOrigin(0.5, 0)
        .setDepth(depth + 2);
      this.objs.push(this.subtitleText);
    } else {
      this.subtitleText = null;
    }

    if (this.showLiveScore) {
      const scoreCenterX = this.barX + this.barW / 2;
      const scoreTopY = this.barY + this.barH + 8;
      this.scoreLabelText = scene.add
        .text(scoreCenterX, scoreTopY, "", {
          fontFamily: FONT_DISPLAY,
          fontSize: "10px",
          color: COLORS.dust,
          letterSpacing: 2,
        })
        .setOrigin(0.5, 0)
        .setDepth(depth + 2);
      this.scoreValueText = scene.add
        .text(scoreCenterX, scoreTopY + 12, "0", {
          fontFamily: FONT,
          fontSize: "24px",
          color: COLORS.gold,
          stroke: "#0A0911",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setDepth(depth + 2);
      this.objs.push(this.scoreLabelText, this.scoreValueText);
    } else {
      this.scoreLabelText = null;
      this.scoreValueText = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  update(hp: number, maxHp: number, hitsLabel?: string): void {
    this.drawSegments(Math.max(0, hp), Math.max(1, maxHp));
    if (this.subtitleText) {
      this.subtitleText.setText(hitsLabel ?? "");
      this.subtitleText.setVisible(Boolean(hitsLabel));
    }
  }

  updateLiveScore(score: number, label: string, delta = 0): void {
    if (!this.scoreValueText || !this.scoreLabelText) return;
    this.scoreLabelText.setText(label.toUpperCase());
    const prev = this.displayedScore;
    this.displayedScore = score;
    this.scoreValueText.setText(String(score));
    if (score < 0) {
      this.scoreValueText.setColor(COLORS.blood);
    } else if (score === 0) {
      this.scoreValueText.setColor(COLORS.dust);
    } else {
      this.scoreValueText.setColor(COLORS.gold);
    }
    if (delta !== 0) {
      this.playScoreDelta(delta);
    } else if (prev !== score) {
      this.scene.tweens.add({
        targets: this.scoreValueText,
        scale: 1.12,
        duration: 90,
        yoyo: true,
        ease: "Sine.Out",
      });
    }
  }

  private playScoreDelta(delta: number): void {
    if (!this.scoreValueText) return;
    const sign = delta > 0 ? "+" : "−";
    const label = `${sign}${Math.abs(delta)}`;
    const color = delta > 0 ? COLORS.verified : COLORS.blood;
    const cx = this.scoreValueText.x;
    const cy = this.scoreValueText.y + 10;
    const float = this.scene.add
      .text(cx, cy, label, {
        fontFamily: FONT,
        fontSize: "20px",
        color,
        stroke: "#0A0911",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(30);
    this.scene.tweens.add({
      targets: this.scoreValueText,
      scale: 1.18,
      duration: 120,
      yoyo: true,
      ease: "Back.Out",
    });
    this.scene.tweens.add({
      targets: float,
      y: cy - 36,
      alpha: 0,
      duration: 850,
      ease: "Cubic.Out",
      onComplete: () => float.destroy(),
    });
  }

  liveScoreAnchor(): { x: number; y: number } {
    const cx = this.barX + this.barW / 2;
    const cy = this.barY + this.barH + 28;
    return { x: cx, y: cy };
  }

  playHit(previousHp: number, newHp: number, maxHp: number): void {
    if (newHp >= previousHp) return;
    this.update(newHp, maxHp);
    const flash = this.scene.add
      .circle(this.barX + this.barW / 2, this.barY + this.barH / 2, 14, C.blood, 0.75)
      .setDepth(20);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.5,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });
  }

  hpBarCenterX(): number { return this.barX + this.barW / 2; }
  hpBarCenterY(): number { return this.barY + this.barH / 2; }

  destroy(): void {
    for (const obj of this.objs) obj.destroy();
    this.objs.length = 0;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private drawSegments(hp: number, maxHp: number): void {
    const g = this.hpGfx;
    g.clear();

    const SEGS = 5;
    const GAP  = 5;
    const segW = Math.floor((this.barW - GAP * (SEGS - 1)) / SEGS);

    const filled = Math.round((hp / Math.max(1, maxHp)) * SEGS);

    for (let i = 0; i < SEGS; i++) {
      const isFilled = i < filled;
      g.fillStyle(isFilled ? 0xcc0000 : C.fog, isFilled ? 1 : 0.28);
      g.fillRect(this.barX + i * (segW + GAP), this.barY, segW, this.barH);
    }
  }
}

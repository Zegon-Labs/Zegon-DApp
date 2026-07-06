import Phaser from "phaser";
import { FONT_DISPLAY } from "../theme.js";
import { HUD_SAFE } from "../layout.js";
import { LANDING_LOGO_KEY, preloadHubLogo } from "./landingBackdrop.js";
import { drawStreakMeter } from "./duelHudDraw.js";

export const HEADER_BAR_KEY = "header-bar";

export function preloadTopHudBar(scene: Phaser.Scene): void {
  if (!scene.textures.exists(HEADER_BAR_KEY)) {
    scene.load.image(HEADER_BAR_KEY, "/sprites/header_bar.png");
  }
  preloadHubLogo(scene);
}

export interface TopHudBarOptions {
  onSettings: () => void;
  onSurrender?: () => void;
  /** Defaults to surrender flag "⚑". Tutorial passes "SKIP". */
  surrenderLabel?: string;
  depth?: number;
}

/**
 * Top header bar backed by header_bar.png (3762 × 418 px).
 *
 * Displayed at HALF screen width (centered) and HALF proportional height.
 * The Y-axis scale is derived from the full-width proportion so the bar
 * isn't distorted vertically when the horizontal size is reduced.
 *
 * At 1280 px screen: bar is 640 × 71 px, centred at X=640.
 */
export class TopHudBar {
  private static readonly SRC_W = 3762;
  private static readonly SRC_H = 418;

  private readonly objs: Phaser.GameObjects.GameObject[] = [];
  private readonly streakTitle: Phaser.GameObjects.Text;
  private readonly meterGfx: Phaser.GameObjects.Graphics;
  private surrenderBtn: Phaser.GameObjects.Text | null = null;

  private readonly meterX: number;
  private readonly meterY: number;
  private readonly meterW: number;
  private readonly meterH = 7;
  private meterSegments = 2;

  readonly barDisplayH: number;

  constructor(scene: Phaser.Scene, opts: TopHudBarOptions) {
    const depth = opts.depth ?? 14;
    const { width } = scene.scale;

    // ── Scale calculations ────────────────────────────────────────────────
    // X: bar is ~42% of the screen width, centered
    const barDisplayW  = Math.round(width * 0.31);
    const barLeft      = (width - barDisplayW) / 2;  // left edge of bar on screen
    const scaleX       = barDisplayW / TopHudBar.SRC_W;

    // Y: height is half of what the bar would be at full-width proportion
    // (use full-width scaleX for height so aspect isn't coupled to bar width)
    const scaleXFull   = width / TopHudBar.SRC_W;
    const fullH        = Math.round(TopHudBar.SRC_H * scaleXFull);
    this.barDisplayH   = Math.round(fullH * 0.60);     // ≈ 85 px at 1280
    const scaleY       = this.barDisplayH / TopHudBar.SRC_H;

    // Vertical centres derived from pixel analysis (source coordinates → screen)
    const wingCenterY  = Math.round((143 + 195 / 2) * scaleY); // ≈ 41
    const panelCenterY = Math.round((26  + 344 / 2) * scaleY); // ≈ 33

    // Content X positions as proportions of the bar's display width
    const centerX    = width / 2;                                      // bar centre
    const streakCX   = Math.round(barLeft + barDisplayW * 0.20);       // left wing
    const settingsX  = Math.round(barLeft + barDisplayW * 0.72);       // right wing
    const surrenderX = Math.round(barLeft + barDisplayW * 0.83);       // right wing

    const barTop = HUD_SAFE.top;

    // ── Bar background image ──────────────────────────────────────────────
    if (scene.textures.exists(HEADER_BAR_KEY)) {
      const bar = scene.add
        .image(centerX, barTop, HEADER_BAR_KEY)
        .setOrigin(0.5, 0)
        .setScale(scaleX, scaleY)
        .setDepth(depth - 3); // below historyLog (12) — no X-overlap but safe
      this.objs.push(bar);
    }

    const wingCenterYAdj = wingCenterY + barTop;
    const panelCenterYAdj = panelCenterY + barTop;

    // ── CENTER: ZEGON logo ────────────────────────────────────────────────
    const logoMaxW = 100;
    if (scene.textures.exists(LANDING_LOGO_KEY)) {
      const logo = scene.add
        .image(centerX, panelCenterYAdj, LANDING_LOGO_KEY)
        .setOrigin(0.5, 0.5)
        .setDepth(depth);
      logo.setScale(Math.min(logoMaxW / logo.width, 1));
      this.objs.push(logo);
    } else {
      const t = scene.add
        .text(centerX, panelCenterYAdj, "ZEGON", {
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          fontSize: "18px",
          color: "#FF4D2E",
          letterSpacing: 4,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(depth);
      this.objs.push(t);
    }

    // ── LEFT WING: streak label + segmented bar ───────────────────────────
    this.streakTitle = scene.add
      .text(streakCX, wingCenterYAdj - 11, "RACHA", {
        fontFamily: FONT_DISPLAY,
        fontSize: "12px",
        color: "#ffffff",
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0.5)
      .setResolution(2)
      .setDepth(depth);
    this.objs.push(this.streakTitle);

    const meterW = 90;
    this.meterX = streakCX - meterW / 2;
    this.meterY = wingCenterYAdj + 1;
    this.meterW = meterW;

    this.meterGfx = scene.add.graphics().setDepth(depth);
    this.objs.push(this.meterGfx);

    drawStreakMeter(
      this.meterGfx, this.meterX, this.meterY, this.meterW, this.meterH,
      0, this.meterSegments,
    );

    // ── RIGHT WING: Settings ⚙ and Surrender ⚑ ───────────────────────────
    const settingsBtn = scene.add
      .text(settingsX, wingCenterYAdj, "\u2699", {
        fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#cc0000",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    this.objs.push(settingsBtn);

    settingsBtn
      .on("pointerover", () => settingsBtn.setColor("#ff3333"))
      .on("pointerout", () => settingsBtn.setColor("#cc0000"))
      .on("pointerdown", () => opts.onSettings());

    const surrenderLabel = opts.surrenderLabel ?? "\u2691";
    const surrenderFontSize = surrenderLabel.length > 2 ? "11px" : "22px";

    const surrenderBtn = scene.add
      .text(surrenderX, wingCenterYAdj, surrenderLabel, {
        fontFamily: surrenderLabel.length > 2 ? FONT_DISPLAY : "Arial, sans-serif",
        fontSize: surrenderFontSize,
        color: "#cc0000",
        letterSpacing: surrenderLabel.length > 2 ? 1 : 0,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth);

    this.surrenderBtn = surrenderBtn;

    if (opts.onSurrender) {
      surrenderBtn.setInteractive({ useHandCursor: true });
      surrenderBtn
        .on("pointerover", () => surrenderBtn.setColor("#ff3333"))
        .on("pointerout", () => surrenderBtn.setColor("#cc0000"))
        .on("pointerdown", () => opts.onSurrender!());
    }

    this.objs.push(surrenderBtn);
  }

  updateSurrenderLabel(label: string): void {
    if (!this.surrenderBtn) return;
    this.surrenderBtn.setText(label);
    this.surrenderBtn.setFontSize(label.length > 2 ? "11px" : "22px");
    this.surrenderBtn.setFontFamily(
      label.length > 2 ? FONT_DISPLAY : "Arial, sans-serif",
    );
  }

  updateStreak(label: string, readingStreak: number, deadeyeStreak: number): void {
    this.streakTitle.setText(label.toUpperCase());
    this.meterSegments = Math.max(2, deadeyeStreak);

    drawStreakMeter(
      this.meterGfx,
      this.meterX, this.meterY, this.meterW, this.meterH,
      readingStreak,
      this.meterSegments,
    );
  }

  destroy(): void {
    for (const obj of this.objs) obj.destroy();
    this.objs.length = 0;
  }
}

import Phaser from "phaser";
import type { DuelConfig, SaloonRelicId, UpgradeLevels } from "@zegon/game-core";
import {
  hasActiveUpgrades,
  relicBadgeLabels,
} from "@zegon/game-core";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import type { UpgradeHudStripLabels } from "./upgradeHudStrip.js";
import { buildBadgeLabels } from "./upgradeHudStrip.js";
import { UTILITY_TABLE_KEY } from "./resultPanel.js";

export interface SaloonLoadoutPanelLabels extends UpgradeHudStripLabels {
  title: string;
  relicsSection: string;
  upgradesSection: string;
}

// Inner padding clears the decorative border of utility_table.png
// (frame art is ~6% of each edge at display size).
const PAD_X = 26;
const TITLE_Y = 18;
const CONTENT_TOP = 52;
const CHIP_GAP = 8;
const CHIP_ROW_H = 26;

/** Loadout panel below duel history — upgrades + relic chips. */
export class SaloonLoadoutPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bgImage: Phaser.GameObjects.Image | null;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly chipBg: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly sectionUpgrades: Phaser.GameObjects.Text;
  private readonly sectionRelics: Phaser.GameObjects.Text;
  private chipTexts: Phaser.GameObjects.Text[] = [];
  private labels: SaloonLoadoutPanelLabels;
  private readonly panelW: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    panelW: number,
    labels: SaloonLoadoutPanelLabels,
    depth = 12,
  ) {
    this.labels = labels;
    this.panelW = panelW;
    this.container = scene.add.container(x, y).setDepth(depth);
    // Ornate table frame (same asset as the result panel) when available.
    this.bgImage = scene.textures.exists(UTILITY_TABLE_KEY)
      ? scene.add.image(0, 0, UTILITY_TABLE_KEY).setOrigin(0.5, 0.5)
      : null;
    this.frame = scene.add.graphics();
    this.chipBg = scene.add.graphics();
    // Header matches DuelHistoryLog: ember display font, left-aligned.
    this.titleText = scene.add
      .text(PAD_X, TITLE_Y, labels.title.toUpperCase(), {
        fontFamily: FONT_DISPLAY,
        fontSize: "14px",
        color: COLORS.ember,
        letterSpacing: 1.5,
      })
      .setOrigin(0, 0);
    this.sectionUpgrades = scene.add.text(PAD_X + 10, CONTENT_TOP, "", {
      fontFamily: FONT,
      fontSize: "10px",
      color: COLORS.dust,
      letterSpacing: 1.4,
    });
    this.sectionRelics = scene.add.text(PAD_X + 10, CONTENT_TOP, "", {
      fontFamily: FONT,
      fontSize: "10px",
      color: COLORS.dust,
      letterSpacing: 1.4,
    });
    const children: Phaser.GameObjects.GameObject[] = [];
    if (this.bgImage) children.push(this.bgImage);
    children.push(
      this.frame,
      this.chipBg,
      this.titleText,
      this.sectionUpgrades,
      this.sectionRelics,
    );
    this.container.add(children);
    this.drawFrame(72);
  }

  private drawFrame(h: number): void {
    const w = this.panelW;
    const g = this.frame;
    g.clear();

    if (this.bgImage) {
      this.bgImage.setPosition(w / 2, h / 2).setDisplaySize(w, h);
      this.drawHeaderDivider(g, w);
      return;
    }

    // Fallback: drawn frame when the texture isn't loaded.
    // Base plate with subtle top-lit gradient feel
    g.fillStyle(0x100d16, 0.94);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x1a1520, 0.5);
    g.fillRect(0, 0, w, Math.min(30, h));

    // Outer hairline
    g.lineStyle(1, 0x2a2638, 1);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Blood accent line across the top
    g.lineStyle(2, C.blood, 0.85);
    g.beginPath();
    g.moveTo(10, 1);
    g.lineTo(w - 10, 1);
    g.strokePath();

    // Gold corner brackets
    const b = 9;
    g.lineStyle(1.5, C.gold, 0.8);
    // top-left
    g.beginPath();
    g.moveTo(4, 4 + b);
    g.lineTo(4, 4);
    g.lineTo(4 + b, 4);
    g.strokePath();
    // top-right
    g.beginPath();
    g.moveTo(w - 4 - b, 4);
    g.lineTo(w - 4, 4);
    g.lineTo(w - 4, 4 + b);
    g.strokePath();
    // bottom-left
    g.beginPath();
    g.moveTo(4, h - 4 - b);
    g.lineTo(4, h - 4);
    g.lineTo(4 + b, h - 4);
    g.strokePath();
    // bottom-right
    g.beginPath();
    g.moveTo(w - 4 - b, h - 4);
    g.lineTo(w - 4, h - 4);
    g.lineTo(w - 4, h - 4 - b);
    g.strokePath();

    this.drawHeaderDivider(g, w);
  }

  /** Blood hairline under the title — same language as the history header. */
  private drawHeaderDivider(g: Phaser.GameObjects.Graphics, w: number): void {
    const ty = TITLE_Y + this.titleText.height + 7;
    g.lineStyle(1, C.blood, 0.42);
    g.lineBetween(PAD_X, ty, w - PAD_X - 8, ty);
  }

  update(
    config: DuelConfig,
    _upgrades: UpgradeLevels | undefined,
    equipped: SaloonRelicId | null | undefined,
    lang: "en" | "es",
  ): void {
    for (const chip of this.chipTexts) chip.destroy();
    this.chipTexts = [];
    this.chipBg.clear();

    const upgradeBadges = hasActiveUpgrades(config)
      ? buildBadgeLabels(config, this.labels)
      : [];
    const relicBadges = equipped ? relicBadgeLabels(equipped, lang) : [];
    const visible = upgradeBadges.length > 0 || relicBadges.length > 0;
    this.container.setVisible(visible);
    if (!visible) return;

    const scene = this.container.scene;
    let y = CONTENT_TOP;
    const innerW = this.panelW - PAD_X * 2;

    if (upgradeBadges.length > 0) {
      this.sectionUpgrades.setText(this.labels.upgradesSection.toUpperCase()).setY(y);
      this.drawSectionTick(this.sectionUpgrades.y + this.sectionUpgrades.height / 2, C.blood);
      y += 17;
      y = this.layoutChips(scene, upgradeBadges, PAD_X, y, innerW, C.blood, COLORS.bone);
      y += 8;
    } else {
      this.sectionUpgrades.setText("");
    }

    if (relicBadges.length > 0) {
      this.sectionRelics.setText(this.labels.relicsSection.toUpperCase()).setY(y);
      this.drawSectionTick(this.sectionRelics.y + this.sectionRelics.height / 2, C.ember);
      y += 17;
      y = this.layoutChips(scene, relicBadges, PAD_X, y, innerW, C.ember, COLORS.ember);
      y += 2;
    } else {
      this.sectionRelics.setText("");
    }

    const bottomPad = this.bgImage ? 24 : 14;
    const panelH = Math.max(this.bgImage ? 110 : 84, y + bottomPad);
    this.drawFrame(panelH);
  }

  /** Small colored square marker before a section label. */
  private drawSectionTick(centerY: number, color: number): void {
    this.chipBg.fillStyle(color, 0.9);
    this.chipBg.fillRect(PAD_X, centerY - 2.5, 5, 5);
  }

  private layoutChips(
    scene: Phaser.Scene,
    badges: string[],
    x: number,
    startY: number,
    maxW: number,
    accent: number,
    color: string,
  ): number {
    let cx = x;
    let cy = startY;

    badges.forEach((label) => {
      const chip = scene.add
        .text(0, 0, label, {
          fontFamily: FONT,
          fontSize: "12px",
          color,
          padding: { x: 9, y: 4 },
        })
        .setOrigin(0, 0);
      if (cx + chip.width > x + maxW) {
        cx = x;
        cy += CHIP_ROW_H;
      }
      chip.setPosition(cx, cy);

      // Bordered chip plate behind the text
      const cw = chip.width;
      const ch = chip.height;
      this.chipBg.fillStyle(0x0b0910, 0.92);
      this.chipBg.fillRoundedRect(cx, cy, cw, ch, 3);
      this.chipBg.fillStyle(accent, 0.07);
      this.chipBg.fillRoundedRect(cx, cy, cw, ch, 3);
      this.chipBg.lineStyle(1, accent, 0.55);
      this.chipBg.strokeRoundedRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1, 3);
      // Accent notch on the left edge
      this.chipBg.fillStyle(accent, 0.85);
      this.chipBg.fillRect(cx, cy + 4, 2, ch - 8);

      this.container.add(chip);
      this.chipTexts.push(chip);
      cx += cw + CHIP_GAP;
    });

    return cy + CHIP_ROW_H;
  }

  refreshLocale(
    labels: SaloonLoadoutPanelLabels,
    config: DuelConfig,
    upgrades: UpgradeLevels | undefined,
    equipped: SaloonRelicId | null | undefined,
    lang: "en" | "es",
  ): void {
    this.labels = labels;
    this.titleText.setText(labels.title.toUpperCase());
    this.update(config, upgrades, equipped, lang);
  }

  destroy(): void {
    for (const chip of this.chipTexts) chip.destroy();
    this.chipTexts = [];
    this.container.destroy(true);
  }
}

export { buildBadgeLabels };

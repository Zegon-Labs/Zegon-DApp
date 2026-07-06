import Phaser from "phaser";
import type { DuelConfig } from "@zegon/game-core";
import {
  COMBAT,
  hasActiveUpgrades,
  previewSaloonStatsFromConfig,
} from "@zegon/game-core";
import { format } from "../../i18n/index.js";
import { shotDamageMultiplierLabel } from "../../utils/damageFormat.js";
import { COLORS, FONT } from "../theme.js";

export interface UpgradeHudStripLabels {
  hits: string;
  shot: string;
  deadeye: string;
  cooldown: string;
  ammo: string;
}

export function buildBadgeLabels(
  config: DuelConfig,
  strings: UpgradeHudStripLabels,
): string[] {
  if (!hasActiveUpgrades(config)) return [];

  const stats = previewSaloonStatsFromConfig(config);
  const badges: string[] = [];
  const baseHits = Math.ceil(COMBAT.INITIAL_HP / COMBAT.HIT_DAMAGE);

  if (stats.maxHits > baseHits) {
    badges.push(
      format(strings.hits, {
        hits: stats.maxHits,
        slots: stats.lifeSlots,
      }),
    );
  }
  if (stats.shotDamage > COMBAT.HIT_DAMAGE) {
    badges.push(
      format(strings.shot, { dmg: shotDamageMultiplierLabel(stats.shotDamage) }),
    );
  }
  if (stats.deadeyeAfterReads > 2) {
    badges.push(format(strings.deadeye, { reads: stats.deadeyeAfterReads }));
  }
  if (stats.itemCooldownRounds < 4) {
    badges.push(format(strings.cooldown, { rounds: stats.itemCooldownRounds }));
  }
  if (stats.extraAmmo > 0) {
    badges.push(format(strings.ammo, { extra: stats.extraAmmo }));
  }
  return badges;
}

/** Compact upgrade badges shown during duels. */
export class UpgradeHudStrip {
  private readonly container: Phaser.GameObjects.Container;
  private chipTexts: Phaser.GameObjects.Text[] = [];
  private labels: UpgradeHudStripLabels;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    labels: UpgradeHudStripLabels,
    depth = 13,
  ) {
    this.labels = labels;
    this.container = scene.add.container(x, y).setDepth(depth);
  }

  update(config: DuelConfig): void {
    for (const chip of this.chipTexts) chip.destroy();
    this.chipTexts = [];

    const badges = buildBadgeLabels(config, this.labels);
    this.container.setVisible(badges.length > 0);
    if (badges.length === 0) return;

    const scene = this.container.scene;
    let x = 0;
    const gap = 8;
    let totalW = 0;
    const chips: Phaser.GameObjects.Text[] = [];

    badges.forEach((label) => {
      const chip = scene.add
        .text(0, 0, label, {
          fontFamily: FONT,
          fontSize: "11px",
          color: COLORS.bone,
          backgroundColor: "#14121ccc",
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0, 0.5);
      chips.push(chip);
      totalW += chip.width + gap;
    });

    totalW -= gap;
    x = -totalW / 2;

    chips.forEach((chip) => {
      chip.setX(x);
      this.container.add(chip);
      this.chipTexts.push(chip);
      x += chip.width + gap;
    });
  }

  refreshLocale(labels: UpgradeHudStripLabels, config: DuelConfig): void {
    this.labels = labels;
    this.update(config);
  }

  destroy(): void {
    for (const chip of this.chipTexts) chip.destroy();
    this.chipTexts = [];
    this.container.destroy(true);
  }
}

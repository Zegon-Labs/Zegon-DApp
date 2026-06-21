import Phaser from "phaser";
import { ALL_DUEL_ITEMS, DuelItemId } from "@zegon/game-core";
import { DUEL_LAYOUT as L } from "../layout.js";
import { playActionHover, playUiClick } from "../../services/sfx.js";
import { C, COLORS, FONT_DISPLAY } from "../theme.js";

export interface ItemSelectorOptions {
  labelFor: (item: DuelItemId) => string;
  descFor: (item: DuelItemId) => string;
  onUseItem: (item: DuelItemId) => void;
  onItemHover?: (item: DuelItemId, hovering: boolean) => void;
  depth?: number;
}

interface ItemChip {
  item: DuelItemId;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

/** Item chips — one click uses the item (no separate USE ITEM step). */
export class ItemSelector {
  private readonly chips: ItemChip[] = [];
  private readonly container: Phaser.GameObjects.Container;
  private readonly labelFor: (item: DuelItemId) => string;
  private cooldown = 0;
  private interactive = false;
  private dimmed = false;
  private allowedItems: Set<DuelItemId> | null = null;

  constructor(scene: Phaser.Scene, opts: ItemSelectorOptions) {
    this.labelFor = opts.labelFor;
    const depth = opts.depth ?? 11;
    const { width } = scene.scale;
    const chipW = 138;
    const chipH = L.items.h;
    const gap = L.items.gap;
    const total = ALL_DUEL_ITEMS.length * chipW + (ALL_DUEL_ITEMS.length - 1) * gap;
    let x = (width - total) / 2 + chipW / 2;
    const y = L.items.y;

    this.container = scene.add.container(0, 0).setDepth(depth);

    ALL_DUEL_ITEMS.forEach((item) => {
      const chipContainer = scene.add.container(x, y);
      const bg = scene.add.rectangle(0, 0, chipW, chipH, C.smoke, 0.88);
      bg.setStrokeStyle(1, C.fog, 0.85);

      const label = scene.add.text(0, 0, opts.labelFor(item), {
        fontFamily: FONT_DISPLAY,
        fontSize: "14px",
        color: COLORS.bone,
        letterSpacing: 1,
      }).setOrigin(0.5, 0.5);

      chipContainer.add([bg, label]);
      this.container.add(chipContainer);

      const chip: ItemChip = { item, container: chipContainer, bg, label };
      this.chips.push(chip);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (this.canUseItem(item)) playActionHover();
        opts.onItemHover?.(item, true);
      });
      bg.on("pointerout", () => {
        opts.onItemHover?.(item, false);
      });
      bg.on("pointerdown", () => {
        if (!this.canUseItem(item)) return;
        playUiClick();
        opts.onUseItem(item);
      });

      x += chipW + gap;
    });

    this.paintAll();
  }

  setAllowedItems(items: Set<DuelItemId> | null): void {
    this.allowedItems = items;
    this.paintAll();
  }

  setCooldown(rounds: number): void {
    this.cooldown = rounds;
    this.paintAll();
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.paintAll();
  }

  setDimmedAll(dimmed: boolean): void {
    this.dimmed = dimmed;
    this.paintAll();
  }

  refreshLabels(): void {
    for (const chip of this.chips) {
      chip.label.setText(this.labelFor(chip.item));
    }
  }

  private canUseItem(item: DuelItemId): boolean {
    if (this.dimmed || !this.interactive || this.cooldown > 0) return false;
    if (this.allowedItems && !this.allowedItems.has(item)) return false;
    return true;
  }

  private paintAll(): void {
    const globalDimmed = this.dimmed || !this.interactive || this.cooldown > 0;
    for (const chip of this.chips) {
      const blocked = this.allowedItems && !this.allowedItems.has(chip.item);
      const dimmed = globalDimmed || blocked;

      chip.container.setScale(1);
      if (dimmed) {
        chip.bg.setFillStyle(C.ash, blocked ? 0.18 : 0.22);
        chip.bg.setStrokeStyle(1, C.fog, 0.35);
        chip.label.setColor(COLORS.dust);
        chip.label.setAlpha(blocked ? 0.35 : 0.45);
        chip.container.setAlpha(0.55);
        continue;
      }

      chip.container.setAlpha(1);
      chip.label.setAlpha(1);
      chip.bg.setFillStyle(C.smoke, 0.72);
      chip.bg.setStrokeStyle(1, C.fog, 0.55);
      chip.label.setColor(COLORS.bone);
    }
  }

  destroy(): void {
    this.container.destroy(true);
    this.chips.length = 0;
  }
}

export function itemCooldownLabel(
  cooldown: number,
  ready: string,
  rounds: (n: number) => string,
): string {
  if (cooldown <= 0) return ready;
  return rounds(cooldown);
}

export function itemDescription(
  item: DuelItemId,
  strings: {
    itemDescSmoke: string;
    itemDescMirror: string;
    itemDescPlate: string;
  },
): string {
  switch (item) {
    case DuelItemId.SMOKE:
      return strings.itemDescSmoke;
    case DuelItemId.MIRROR:
      return strings.itemDescMirror;
    case DuelItemId.PLATE:
      return strings.itemDescPlate;
  }
}

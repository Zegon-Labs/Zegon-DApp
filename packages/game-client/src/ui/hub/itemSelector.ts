import Phaser from "phaser";
import { ALL_DUEL_ITEMS, DuelItemId } from "@zegon/game-core";
import { DUEL_LAYOUT as L } from "../layout.js";
import { playActionHover, playUiClick } from "../../services/sfx.js";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";

export interface ItemSelectorOptions {
  labelFor: (item: DuelItemId) => string;
  descFor: (item: DuelItemId) => string;
  onSelect: (item: DuelItemId) => void;
  onItemHover?: (item: DuelItemId, hovering: boolean) => void;
  depth?: number;
}

interface ItemChip {
  item: DuelItemId;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  check: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
}

/** Item chips with clear selection ring; description on hover via callback. */
export class ItemSelector {
  private readonly chips: ItemChip[] = [];
  private readonly container: Phaser.GameObjects.Container;
  private selected: DuelItemId = DuelItemId.SMOKE;
  private cooldown = 0;
  private interactive = false;

  constructor(scene: Phaser.Scene, opts: ItemSelectorOptions) {
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

      const check = scene.add.text(-chipW / 2 + 12, 0, "▸", {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.ember,
      }).setOrigin(0.5, 0.5).setVisible(false);

      chipContainer.add([bg, check, label]);
      this.container.add(chipContainer);

      const chip: ItemChip = { item, container: chipContainer, bg, check, label };
      this.chips.push(chip);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (this.interactive && this.cooldown <= 0) playActionHover();
        opts.onItemHover?.(item, true);
      });
      bg.on("pointerout", () => {
        opts.onItemHover?.(item, false);
      });
      bg.on("pointerdown", () => {
        if (!this.interactive || this.cooldown > 0) return;
        playUiClick();
        this.selected = item;
        opts.onSelect(item);
        this.paintAll();
      });

      x += chipW + gap;
    });

    this.paintAll();
  }

  getSelected(): DuelItemId {
    return this.selected;
  }

  setCooldown(rounds: number): void {
    this.cooldown = rounds;
    this.paintAll();
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.paintAll();
  }

  private paintAll(): void {
    const dimmed = !this.interactive || this.cooldown > 0;
    for (const chip of this.chips) {
      const active = chip.item === this.selected;
      chip.container.setScale(active ? 1.04 : 1);
      chip.check.setVisible(active && !dimmed);

      if (dimmed) {
        chip.bg.setFillStyle(C.ash, active ? 0.35 : 0.22);
        chip.bg.setStrokeStyle(active ? 2 : 1, active ? C.ember : C.fog, active ? 0.7 : 0.35);
        chip.label.setColor(active ? COLORS.ember : COLORS.dust);
        chip.label.setAlpha(active ? 0.75 : 0.45);
        chip.container.setAlpha(0.55);
        continue;
      }

      chip.container.setAlpha(1);
      chip.label.setAlpha(1);
      if (active) {
        chip.bg.setFillStyle(C.blood, 0.38);
        chip.bg.setStrokeStyle(2, C.ember, 1);
        chip.label.setColor(COLORS.ember);
      } else {
        chip.bg.setFillStyle(C.smoke, 0.72);
        chip.bg.setStrokeStyle(1, C.fog, 0.55);
        chip.label.setColor(COLORS.dust);
      }
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

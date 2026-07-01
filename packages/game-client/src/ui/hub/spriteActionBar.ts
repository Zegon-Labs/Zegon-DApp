import Phaser from "phaser";
import { PlayerAction } from "@zegon/game-core";
import type { DuelItemId } from "@zegon/game-core";
import { DUEL_LAYOUT as L } from "../layout.js";
import { COLORS, FONT_DISPLAY } from "../theme.js";
import { playActionHover, playUiClick } from "../../services/sfx.js";

export const ACTION_PANEL_KEY = "action-panel";
export const ACTION_BTN_KEY = "action-btn";

const BTN_FRAME_W = 991;
const BTN_FRAME_H = 793;

const BAND_EDGES_SRC = [
  [29, 176], [708, 771], [1301, 1366], [1924, 1986], [2518, 2581], [3132, 3287],
] as [number, number][];

const SLOT_SRC_CENTRES = BAND_EDGES_SRC.slice(0, -1).map((b, i) =>
  (b[1]! + BAND_EDGES_SRC[i + 1]![0]) / 2
);

const SLOT_INTERIOR_W_SRC = 541;
const PANEL_OPAQUE_SRC_W = 3318 - 2 * 22;

export function preloadActionAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ACTION_PANEL_KEY)) {
    scene.load.image(ACTION_PANEL_KEY, "/sprites/action_panel.png");
  }
  if (!scene.textures.exists(ACTION_BTN_KEY)) {
    scene.load.spritesheet(ACTION_BTN_KEY, "/sprites/button_states.png", {
      frameWidth: BTN_FRAME_W,
      frameHeight: BTN_FRAME_H,
    });
  }
}

export interface SpriteActionEntry {
  label: string;
  action: PlayerAction;
  /** If set, equip this item before dispatching USE_ITEM. */
  item?: DuelItemId;
  /** Shown in the ? floating tooltip. */
  helpText?: string;
}

export interface SpriteActionBarOptions {
  entries: SpriteActionEntry[];
  onAction: (action: PlayerAction, item?: DuelItemId) => void;
  depth?: number;
}

interface HelpButton {
  badge: Phaser.GameObjects.Text;
  tooltip: Phaser.GameObjects.Container;
  tooltipBg: Phaser.GameObjects.Rectangle;
  tooltipText: Phaser.GameObjects.Text;
}

export class SpriteActionBar {
  private readonly entries: SpriteActionEntry[];
  private readonly buttons: Phaser.GameObjects.Sprite[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly helpButtons: HelpButton[] = [];
  private readonly panel: Phaser.GameObjects.Image | null = null;
  private readonly enabledStates: boolean[];
  private readonly depth: number;
  private readonly btnScale: number;
  private activeTooltipIndex: number | null = null;
  private dimmedAll = false;

  constructor(scene: Phaser.Scene, opts: SpriteActionBarOptions) {
    this.entries = opts.entries;
    this.enabledStates = new Array(opts.entries.length).fill(false);
    this.depth = opts.depth ?? 12;

    const { width } = scene.scale;
    const depth = this.depth;
    const n = opts.entries.length;

    const panelScale = width / PANEL_OPAQUE_SRC_W;
    const panelLeftEdge = -(22 * panelScale);

    if (scene.textures.exists(ACTION_PANEL_KEY)) {
      this.panel = scene.add
        .image(width / 2, L.bottomStrip.centerY, ACTION_PANEL_KEY)
        .setOrigin(0.5, 0.5)
        .setScale(panelScale)
        .setDepth(depth - 4);
    }

    const slotXs = SLOT_SRC_CENTRES.slice(0, n).map(srcC =>
      Math.round(panelLeftEdge + srcC * panelScale)
    );

    const slotDisplayW = SLOT_INTERIOR_W_SRC * panelScale;
    this.btnScale = (slotDisplayW * 0.85) / BTN_FRAME_W;
    const y = L.bottomStrip.centerY;

    const btnDisplayW = BTN_FRAME_W * this.btnScale;
    const fontSize = Math.max(10, Math.min(14, Math.floor(btnDisplayW * 0.10)));

    opts.entries.forEach((entry, i) => {
      const x = slotXs[i] ?? 0;

      const sprite = scene.add
        .sprite(x, y, ACTION_BTN_KEY, 0)
        .setOrigin(0.5, 0.5)
        .setScale(this.btnScale)
        .setDepth(depth)
        .setAlpha(0.4);

      sprite.setInteractive({ useHandCursor: true });

      sprite.on("pointerover", () => {
        if (!this.enabledStates[i] || this.dimmedAll) return;
        sprite.setFrame(1);
        playActionHover();
      });
      sprite.on("pointerout", () => {
        if (this.enabledStates[i] && !this.dimmedAll) sprite.setFrame(0);
      });
      sprite.on("pointerdown", () => {
        if (!this.enabledStates[i] || this.dimmedAll) return;
        playUiClick();
        opts.onAction(entry.action, entry.item);
      });

      this.buttons.push(sprite);

      const label = scene.add
        .text(x, y, entry.label, {
          fontFamily: FONT_DISPLAY,
          fontSize: `${fontSize}px`,
          color: COLORS.bone,
          letterSpacing: 1,
          align: "center",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(depth + 1)
        .setAlpha(0.45);

      this.labels.push(label);

      const help = this.createHelpButton(scene, x, y, btnDisplayW, depth, i);
      this.helpButtons.push(help);
      this.setHelpText(i, entry.helpText ?? "");
    });
  }

  private createHelpButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    btnDisplayW: number,
    depth: number,
    index: number,
  ): HelpButton {
    const badgeSize = Math.max(14, Math.min(18, Math.floor(btnDisplayW * 0.12)));
    const badgeX = x + btnDisplayW * 0.34;
    const badgeY = y - btnDisplayW * 0.34;

    const tooltipW = Math.min(220, Math.max(168, btnDisplayW * 1.05));
    const tooltipPad = 8;

    const tooltipBg = scene.add
      .rectangle(0, 0, tooltipW, 40, 0x0a0808, 0.94)
      .setStrokeStyle(1, 0x8b1a1a, 0.85);

    const tooltipText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_DISPLAY,
        fontSize: "11px",
        color: COLORS.bone,
        align: "center",
        wordWrap: { width: tooltipW - tooltipPad * 2 },
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0.5);

    const tooltip = scene.add
      .container(x, badgeY - badgeSize - 6, [tooltipBg, tooltipText])
      .setDepth(depth + 4)
      .setVisible(false);

    const badge = scene.add
      .text(badgeX, badgeY, "?", {
        fontFamily: FONT_DISPLAY,
        fontSize: `${badgeSize}px`,
        color: COLORS.bone,
        backgroundColor: "#1a1010cc",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 3)
      .setAlpha(0.75);

    badge.setInteractive({ useHandCursor: true });
    badge.on("pointerover", () => {
      if (this.dimmedAll) return;
      this.showTooltip(index);
    });
    badge.on("pointerout", () => this.hideTooltip(index));
    badge.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.activeTooltipIndex === index) {
        this.hideTooltip(index);
      } else {
        this.showTooltip(index);
      }
    });

    return { badge, tooltip, tooltipBg, tooltipText };
  }

  private showTooltip(index: number): void {
    this.hideAllTooltips();
    const help = this.helpButtons[index];
    if (!help || !help.tooltipText.text) return;
    this.activeTooltipIndex = index;
    help.badge.setAlpha(1).setColor(COLORS.ember);
    help.tooltip.setVisible(true);
  }

  private hideTooltip(index: number): void {
    if (this.activeTooltipIndex !== index) return;
    this.hideAllTooltips();
  }

  private hideAllTooltips(): void {
    this.activeTooltipIndex = null;
    this.helpButtons.forEach((help) => {
      help.tooltip.setVisible(false);
      help.badge.setAlpha(this.dimmedAll ? 0.35 : 0.75).setColor(COLORS.bone);
    });
  }

  private setHelpText(index: number, text: string): void {
    const help = this.helpButtons[index];
    if (!help) return;
    help.tooltipText.setText(text);
    const tooltipW = help.tooltipBg.width;
    const textH = help.tooltipText.height;
    const boxH = Math.max(36, textH + 16);
    help.tooltipBg.setSize(tooltipW, boxH);
    help.tooltip.setY(help.badge.y - help.badge.height - boxH / 2 - 4);
    if (this.entries[index]) this.entries[index]!.helpText = text;
  }

  /** Replace help tooltip copy for all entries in order. */
  refreshHelpTexts(texts: string[]): void {
    texts.forEach((text, i) => this.setHelpText(i, text));
  }

  setEnabledMap(canAct: boolean, available: Set<PlayerAction>): void {
    this.entries.forEach((entry, i) => {
      const enabled = canAct && available.has(entry.action);
      if (this.enabledStates[i] === enabled) return;
      this.enabledStates[i] = enabled;
      this.applyState(i);
    });
  }

  /** Per-slot enablement (tutorial restricts individual item buttons). */
  setSlotEnabledMap(canAct: boolean, enabledSlots: Set<number>): void {
    this.entries.forEach((_, i) => {
      const enabled = canAct && enabledSlots.has(i);
      if (this.enabledStates[i] === enabled) return;
      this.enabledStates[i] = enabled;
      this.applyState(i);
    });
  }

  setVisible(visible: boolean): void {
    this.panel?.setVisible(visible);
    this.buttons.forEach((b) => b.setVisible(visible));
    this.labels.forEach((l) => l.setVisible(visible));
    this.helpButtons.forEach((h) => {
      h.badge.setVisible(visible);
      if (!visible) h.tooltip.setVisible(false);
    });
    if (!visible) this.hideAllTooltips();
  }

  setDimmedAll(dimmed: boolean): void {
    if (this.dimmedAll === dimmed) return;
    this.dimmedAll = dimmed;
    this.hideAllTooltips();
    this.buttons.forEach((_, i) => this.applyState(i));
  }

  resetHoverAll(): void {
    this.buttons.forEach((btn) => btn.setFrame(0));
    this.hideAllTooltips();
  }

  refreshLabels(newLabels: string[]): void {
    newLabels.forEach((lbl, i) => {
      this.labels[i]?.setText(lbl);
      if (this.entries[i]) this.entries[i]!.label = lbl;
    });
  }

  destroy(): void {
    this.panel?.destroy();
    this.buttons.forEach((b) => b.destroy());
    this.labels.forEach((l) => l.destroy());
    this.helpButtons.forEach((h) => {
      h.badge.destroy();
      h.tooltip.destroy();
    });
    this.buttons.length = 0;
    this.labels.length = 0;
    this.helpButtons.length = 0;
  }

  private applyState(i: number): void {
    const btn = this.buttons[i];
    const lbl = this.labels[i];
    const help = this.helpButtons[i];
    if (!btn || !lbl || !help) return;
    const active = this.enabledStates[i] && !this.dimmedAll;
    btn.setAlpha(active ? 1 : 0.4);
    btn.setFrame(0);
    lbl.setAlpha(active ? 1 : 0.4);
    help.badge.setAlpha(active && !this.dimmedAll ? 0.85 : 0.35);
  }
}

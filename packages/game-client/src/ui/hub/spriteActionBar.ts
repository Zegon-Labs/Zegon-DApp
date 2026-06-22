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

// Pixel-analysed band edges [bandStart, bandEnd] in action_panel.png source px.
// Bands: left-border | div1 | div2 | div3 | div4 | right-border.
const BAND_EDGES_SRC = [
  [29, 176], [708, 771], [1301, 1366], [1924, 1986], [2518, 2581], [3132, 3287],
] as [number, number][];

// Slot interior centres (midpoint between end-of-bandN and start-of-bandN+1) in source px.
// Values: ~442, 1036, 1645, 2252, 2857
const SLOT_SRC_CENTRES = BAND_EDGES_SRC.slice(0, -1).map((b, i) =>
  (b[1]! + BAND_EDGES_SRC[i + 1]![0]) / 2
);

// Average slot interior width in source px: (532+530+558+532+551)/5 ≈ 541
const SLOT_INTERIOR_W_SRC = 541;

// Source 3318px total; 22px transparent margin each side → opaque content = 3274px.
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
}

export interface SpriteActionBarOptions {
  entries: SpriteActionEntry[];
  onAction: (action: PlayerAction, item?: DuelItemId) => void;
  onHover?: (action: PlayerAction, item: DuelItemId | undefined, hovering: boolean) => void;
  depth?: number;
}

export class SpriteActionBar {
  private readonly entries: SpriteActionEntry[];
  private readonly buttons: Phaser.GameObjects.Sprite[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly panel: Phaser.GameObjects.Image | null = null;
  private readonly enabledStates: boolean[];
  private dimmedAll = false;

  constructor(scene: Phaser.Scene, opts: SpriteActionBarOptions) {
    this.entries = opts.entries;
    this.enabledStates = new Array(opts.entries.length).fill(false);

    const { width } = scene.scale;
    const depth = opts.depth ?? 12;
    const n = opts.entries.length;

    // Scale so opaque content (x=22..3296 in source) fills exactly x=0..width on screen.
    // The 22px transparent margin on each side goes ~8.6px off-screen — not visible.
    const panelScale = width / PANEL_OPAQUE_SRC_W;
    // Panel centre stays at width/2; left edge of image is at -(22*panelScale) ≈ -8.6px.
    const panelLeftEdge = -(22 * panelScale);

    // Panel background — origin (0.5, 0.5) centred on strip.
    // Depth below combatHud (depth 9) so life panels render on top.
    if (scene.textures.exists(ACTION_PANEL_KEY)) {
      this.panel = scene.add
        .image(width / 2, L.bottomStrip.centerY, ACTION_PANEL_KEY)
        .setOrigin(0.5, 0.5)
        .setScale(panelScale)
        .setDepth(depth - 4);
    }

    // Slot X centres: midpoint of each slot interior mapped to screen space.
    const slotXs = SLOT_SRC_CENTRES.slice(0, n).map(srcC =>
      Math.round(panelLeftEdge + srcC * panelScale)
    );

    // Button scale: fit 85% of slot interior width.
    const slotDisplayW = SLOT_INTERIOR_W_SRC * panelScale;
    const btnScale     = (slotDisplayW * 0.85) / BTN_FRAME_W;
    const y            = L.bottomStrip.centerY;

    // Font size relative to displayed button width so labels always fit.
    const btnDisplayW  = BTN_FRAME_W * btnScale;
    const fontSize     = Math.max(10, Math.min(14, Math.floor(btnDisplayW * 0.10)));

    opts.entries.forEach((entry, i) => {
      const x = slotXs[i] ?? 0;

      const sprite = scene.add
        .sprite(x, y, ACTION_BTN_KEY, 0)
        .setOrigin(0.5, 0.5)
        .setScale(btnScale)
        .setDepth(depth)
        .setAlpha(0.4);

      sprite.setInteractive({ useHandCursor: true });

      sprite.on("pointerover", () => {
        if (!this.enabledStates[i] || this.dimmedAll) return;
        sprite.setFrame(1);
        playActionHover();
        opts.onHover?.(entry.action, entry.item, true);
      });
      sprite.on("pointerout", () => {
        if (this.enabledStates[i] && !this.dimmedAll) sprite.setFrame(0);
        opts.onHover?.(entry.action, entry.item, false);
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
    });
  }

  setEnabledMap(canAct: boolean, available: Set<PlayerAction>): void {
    this.entries.forEach((entry, i) => {
      const enabled = canAct && available.has(entry.action);
      if (this.enabledStates[i] === enabled) return;
      this.enabledStates[i] = enabled;
      this.applyState(i);
    });
  }

  setDimmedAll(dimmed: boolean): void {
    if (this.dimmedAll === dimmed) return;
    this.dimmedAll = dimmed;
    this.buttons.forEach((_, i) => this.applyState(i));
  }

  resetHoverAll(): void {
    this.buttons.forEach((btn) => btn.setFrame(0));
  }

  /** Replace labels for all entries in order. */
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
    this.buttons.length = 0;
    this.labels.length = 0;
  }

  private applyState(i: number): void {
    const btn = this.buttons[i];
    const lbl = this.labels[i];
    if (!btn || !lbl) return;
    const active = this.enabledStates[i] && !this.dimmedAll;
    btn.setAlpha(active ? 1 : 0.4);
    btn.setFrame(0);
    lbl.setAlpha(active ? 1 : 0.4);
  }
}

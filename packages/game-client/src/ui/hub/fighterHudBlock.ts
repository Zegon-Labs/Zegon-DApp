import Phaser from "phaser";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import { drawHubHpBar } from "./hpBar.js";

export interface FighterHudBlockState {
  name: string;
  hp: number;
  maxHp?: number;
  /** Extra stats, e.g. "AMMO ×4" or deadeye warning. */
  detail?: string;
}

export interface FighterHudBlockOptions {
  edgeX: number;
  align: "left" | "right";
  depth?: number;
}

/** Mirrored fighter panel — identical layout for player and ZEGON. */
export class FighterHudBlock {
  readonly container: Phaser.GameObjects.Container;
  private readonly hpGfx: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;
  private readonly align: "left" | "right";
  private readonly edgeX: number;
  private readonly barW = L.stats.hpBarW;
  private readonly barH = L.stats.hpBarH;
  private readonly barY = L.stats.hpBarY;

  constructor(scene: Phaser.Scene, options: FighterHudBlockOptions) {
    this.align = options.align;
    this.edgeX = options.edgeX;
    const depth = options.depth ?? 9;

    this.container = scene.add.container(0, 0).setDepth(depth);
    this.hpGfx = scene.add.graphics();

    const nameOrigin = this.align === "left" ? 0 : 1;
    const nameX = this.edgeX;

    this.nameText = scene.add.text(nameX, L.stats.y - 28, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "20px",
      color: COLORS.bone,
      letterSpacing: 1,
    }).setOrigin(nameOrigin, 0);

    this.statsText = scene.add.text(nameX, this.barY + this.barH + 6, "", {
      fontFamily: FONT,
      fontSize: "18px",
      color: COLORS.dust,
    }).setOrigin(nameOrigin, 0);

    this.container.add([this.hpGfx, this.nameText, this.statsText]);
  }

  private barX(): number {
    return this.align === "left"
      ? this.edgeX
      : this.edgeX - this.barW;
  }

  update(state: FighterHudBlockState): void {
    const maxHp = state.maxHp ?? 100;
    this.nameText.setText(state.name);
    this.hpGfx.clear();
    drawHubHpBar(this.hpGfx, this.barX(), this.barY, this.barW, this.barH, state.hp, maxHp);

    const hpLine = `${state.hp} HP`;
    this.statsText.setText(state.detail ? `${hpLine} · ${state.detail}` : hpLine);
  }

  /** Center of HP bar — for floating damage anchors. */
  hpBarCenterY(): number {
    return this.barY + this.barH / 2;
  }

  hpBarCenterX(): number {
    return this.barX() + this.barW / 2;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

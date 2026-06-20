import Phaser from "phaser";
import { drawBlindsightMeter, drawHpBar } from "../components.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";

export interface CombatHudState {
  playerHp: number;
  zegonHp: number;
  ammo: number;
  blindsight: number;
  playerLabel: string;
  zegonLabel: string;
  ammoLabel: string;
  blindsightLabel: string;
}

export class CombatHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly blindsightGfx: Phaser.GameObjects.Graphics;
  private readonly hpGfx: Phaser.GameObjects.Graphics;
  private readonly playerText: Phaser.GameObjects.Text;
  private readonly zegonText: Phaser.GameObjects.Text;
  private readonly blindsightText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, depth = 9) {
    this.scene = scene;
    const { width } = scene.scale;

    this.container = scene.add.container(0, 0).setDepth(depth);
    this.blindsightGfx = scene.add.graphics();
    this.hpGfx = scene.add.graphics();

    this.blindsightText = scene.add.text(L.blindsight.labelX, L.blindsight.labelY, "", {
      fontFamily: FONT_DISPLAY,
      fontSize: "20px",
      color: COLORS.ember,
      letterSpacing: 1,
    }).setOrigin(1, 0);

    this.playerText = scene.add.text(30, L.stats.y, "", {
      fontFamily: FONT,
      fontSize: "22px",
      color: COLORS.bone,
    });

    this.zegonText = scene.add.text(width - 30, L.stats.y, "", {
      fontFamily: FONT,
      fontSize: "22px",
      color: COLORS.ember,
    }).setOrigin(1, 0);

    this.container.add([
      this.blindsightGfx,
      this.hpGfx,
      this.blindsightText,
      this.playerText,
      this.zegonText,
    ]);
  }

  update(state: CombatHudState): void {
    const { width } = this.scene.scale;

    drawBlindsightMeter(
      this.blindsightGfx,
      L.blindsight.barX,
      L.blindsight.barY,
      L.blindsight.barW,
      L.blindsight.barH,
      state.blindsight,
    );

    this.hpGfx.clear();
    drawHpBar(
      this.hpGfx,
      30,
      L.stats.hpBarY,
      L.stats.hpBarW,
      L.stats.hpBarH,
      state.playerHp,
      100,
      C.blood,
    );
    drawHpBar(
      this.hpGfx,
      width - 30 - L.stats.hpBarW,
      L.stats.hpBarY,
      L.stats.hpBarW,
      L.stats.hpBarH,
      state.zegonHp,
      100,
      C.ember,
    );

    this.blindsightText.setText(state.blindsightLabel);
    this.playerText.setText(`${state.playerLabel} ${state.playerHp} HP · ${state.ammoLabel} ×${state.ammo}`);
    this.zegonText.setText(`${state.zegonLabel} ${state.zegonHp} HP`);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

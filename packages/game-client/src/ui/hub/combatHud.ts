import Phaser from "phaser";
import { BlindsightMeter } from "./blindsightMeter.js";
import { FighterHudBlock } from "./fighterHudBlock.js";

export interface CombatHudState {
  playerHp: number;
  zegonHp: number;
  ammo: number;
  blindsight: number;
  playerLabel: string;
  zegonLabel: string;
  ammoLabel: string;
  blindsightLabel: string;
  zegonDetail?: string;
}

export class CombatHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly playerBlock: FighterHudBlock;
  private readonly zegonBlock: FighterHudBlock;
  private readonly blindsightMeter: BlindsightMeter;

  constructor(scene: Phaser.Scene, depth = 9) {
    const { width } = scene.scale;
    const margin = 30;

    this.container = scene.add.container(0, 0).setDepth(depth);
    this.playerBlock = new FighterHudBlock(scene, { edgeX: margin, align: "left", depth });
    this.zegonBlock = new FighterHudBlock(scene, { edgeX: width - margin, align: "right", depth });
    this.blindsightMeter = new BlindsightMeter(scene, depth);

    this.container.add([
      this.playerBlock.container,
      this.zegonBlock.container,
      this.blindsightMeter.container,
    ]);
  }

  update(state: CombatHudState): void {
    this.playerBlock.update({
      name: state.playerLabel,
      hp: state.playerHp,
      detail: `${state.ammoLabel} ×${state.ammo}`,
    });
    this.zegonBlock.update({
      name: state.zegonLabel,
      hp: state.zegonHp,
      detail: state.zegonDetail,
    });
    this.blindsightMeter.update(state.blindsightLabel, state.blindsight);
  }

  playerDamageAnchor(): { x: number; y: number } {
    return {
      x: this.playerBlock.hpBarCenterX(),
      y: this.playerBlock.hpBarCenterY(),
    };
  }

  zegonDamageAnchor(): { x: number; y: number } {
    return {
      x: this.zegonBlock.hpBarCenterX(),
      y: this.zegonBlock.hpBarCenterY(),
    };
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.playerBlock.destroy();
    this.zegonBlock.destroy();
    this.blindsightMeter.destroy();
    this.container.destroy(false);
  }
}

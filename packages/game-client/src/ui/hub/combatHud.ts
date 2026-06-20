import Phaser from "phaser";
import { BlindsightMeter } from "./blindsightMeter.js";
import { FighterHudBlock } from "./fighterHudBlock.js";

export interface CombatHudState {
  playerHp: number;
  zegonHp: number;
  playerMaxHp: number;
  zegonMaxHp: number;
  ammo: number;
  maxAmmo: number;
  blindsight: number;
  playerLabel: string;
  zegonLabel: string;
  weaponLabel: string;
  hudWeapon: string;
  hudStatus: string;
  blindsightLabel: string;
  blindsightFlavor: string;
  nextMoveHint: string;
  zegonStatus?: string;
}

export class CombatHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly playerBlock: FighterHudBlock;
  private readonly zegonBlock: FighterHudBlock;
  private readonly blindsightMeter: BlindsightMeter;

  constructor(scene: Phaser.Scene, depth = 9) {
    this.container = scene.add.container(0, 0).setDepth(depth);
    this.playerBlock = new FighterHudBlock(scene, {
      align: "left",
      variant: "player",
      depth,
    });
    this.zegonBlock = new FighterHudBlock(scene, {
      align: "right",
      variant: "zegon",
      depth,
    });
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
      maxHp: state.playerMaxHp,
      ammo: state.ammo,
      maxAmmo: state.maxAmmo,
      weaponLabel: state.weaponLabel,
      detail: state.hudWeapon,
    });
    this.zegonBlock.update({
      name: state.zegonLabel,
      hp: state.zegonHp,
      maxHp: state.zegonMaxHp,
      statusLabel: state.zegonStatus,
      detail: state.hudStatus,
    });
    this.blindsightMeter.update(
      state.blindsightLabel,
      state.blindsight,
      state.blindsightFlavor,
      state.nextMoveHint,
    );
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

  destroy(): void {
    this.playerBlock.destroy();
    this.zegonBlock.destroy();
    this.blindsightMeter.destroy();
    this.container.destroy(false);
  }
}

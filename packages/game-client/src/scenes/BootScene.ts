import Phaser from "phaser";
import { ASSETS } from "../config/assets.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("banner", ASSETS.banner);
    this.load.image("logo", ASSETS.logo);
    this.load.image("menu_inicio", ASSETS.menuInicio);
    this.load.image("duel_normal", ASSETS.duelNormal);
    this.load.image("duel_damaged", ASSETS.duelDamaged);
    this.load.image("duel_fire", ASSETS.duelFire);
    this.load.image("duel_your_turn", ASSETS.duelYourTurn);
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}

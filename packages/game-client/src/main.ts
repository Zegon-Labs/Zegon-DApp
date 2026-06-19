import Phaser from "phaser";
import { TitleScene } from "./scenes/TitleScene.js";
import { DuelScene } from "./scenes/DuelScene.js";
import { ResultScene } from "./scenes/ResultScene.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 854,
  height: 480,
  parent: "game-container",
  backgroundColor: "#0A0911",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, DuelScene, ResultScene],
};

new Phaser.Game(config);

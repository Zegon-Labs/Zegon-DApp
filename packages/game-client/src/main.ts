import Phaser from "phaser";
import { TitleScene } from "./scenes/TitleScene.js";
import { DuelScene } from "./scenes/DuelScene.js";
import { ResultScene } from "./scenes/ResultScene.js";
import { SettingsScene } from "./scenes/SettingsScene.js";
import { TutorialScene } from "./scenes/TutorialScene.js";
import { LeaderboardScene } from "./scenes/LeaderboardScene.js";
import { C } from "./ui/theme.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 854,
  height: 480,
  parent: "game-container",
  backgroundColor: C.void,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    TitleScene,
    SettingsScene,
    TutorialScene,
    DuelScene,
    ResultScene,
    LeaderboardScene,
  ],
};

new Phaser.Game(config);

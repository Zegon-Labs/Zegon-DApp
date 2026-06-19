import Phaser from "phaser";
import { BlankScene } from "../scenes/BlankScene.js";
import { DuelScene } from "../scenes/DuelScene.js";
import { ResultScene } from "../scenes/ResultScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { C } from "../ui/theme.js";

let gameInstance: Phaser.Game | null = null;

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    width: 854,
    height: 480,
    parent,
    backgroundColor: C.void,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BlankScene, TutorialScene, DuelScene, ResultScene],
  });

  return gameInstance;
}

export function destroyPhaserGame(): void {
  gameInstance?.destroy(true);
  gameInstance = null;
}

export function startPhaserScene(scene: string, data?: Record<string, unknown>): void {
  if (!gameInstance) return;
  gameInstance.scene.start(scene, data);
}

export function stopToBlank(): void {
  if (!gameInstance) return;
  gameInstance.scene.start("BlankScene");
}

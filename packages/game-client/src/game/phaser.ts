import Phaser from "phaser";
import { BlankScene } from "../scenes/BlankScene.js";
import { DuelScene } from "../scenes/DuelScene.js";
import { ResultScene } from "../scenes/ResultScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../ui/layout.js";
import { C } from "../ui/theme.js";

let gameInstance: Phaser.Game | null = null;
let pendingScene: { scene: string; data?: Record<string, unknown> } | null = null;

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: C.void,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
      pixelArt: false,
    },
    scene: [BlankScene, TutorialScene, DuelScene, ResultScene],
  });

  if (pendingScene) {
    gameInstance.scene.start(pendingScene.scene, pendingScene.data);
    pendingScene = null;
  }

  return gameInstance;
}

export function destroyPhaserGame(): void {
  gameInstance?.destroy(true);
  gameInstance = null;
}

export function startPhaserScene(scene: string, data?: Record<string, unknown>): void {
  if (!gameInstance) {
    pendingScene = { scene, data };
    return;
  }
  gameInstance.scene.start(scene, data);
}

export function stopToBlank(): void {
  if (!gameInstance) return;
  gameInstance.scene.start("BlankScene");
}

import Phaser from "phaser";
import { BlankScene } from "../scenes/BlankScene.js";
import { DuelScene } from "../scenes/DuelScene.js";
import { ResultScene } from "../scenes/ResultScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../ui/layout.js";
import { C } from "../ui/theme.js";

let gameInstance: Phaser.Game | null = null;
let pendingScene: { scene: string; data?: Record<string, unknown> } | null = null;

const GAME_ASPECT = GAME_WIDTH / GAME_HEIGHT;

/** Wide screens: cover (no side bars). Taller/narrower: contain (no HUD crop). */
function pickScaleMode(): typeof Phaser.Scale.FIT | typeof Phaser.Scale.ENVELOP {
  if (typeof window === "undefined") return Phaser.Scale.ENVELOP;
  const aspect = window.innerWidth / window.innerHeight;
  return aspect >= GAME_ASPECT ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
}

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
      mode: pickScaleMode(),
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

/** Recompute canvas size after the stage container becomes visible. */
export function refreshPhaserScale(): void {
  if (!gameInstance) return;
  const scale = gameInstance.scale;
  const nextMode = pickScaleMode();
  if (scale.scaleMode !== nextMode) {
    scale.scaleMode = nextMode;
  }
  scale.refresh();
}

export function startPhaserScene(scene: string, data?: Record<string, unknown>): void {
  if (!gameInstance) {
    pendingScene = { scene, data };
    return;
  }
  const active = gameInstance.scene.getScenes(true);
  for (const s of active) {
    if (s.scene.key !== scene) {
      gameInstance.scene.stop(s.scene.key);
    }
  }
  gameInstance.scene.start(scene, data);
}

export function stopToBlank(): void {
  if (!gameInstance) return;
  gameInstance.scene.start("BlankScene");
}

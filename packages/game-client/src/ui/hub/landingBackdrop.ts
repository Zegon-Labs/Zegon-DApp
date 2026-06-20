import Phaser from "phaser";
import { C } from "../theme.js";

export const LANDING_BG_KEY = "landing-bg";

export function preloadLandingBackdrop(scene: Phaser.Scene): void {
  if (!scene.textures.exists(LANDING_BG_KEY)) {
    scene.load.image(LANDING_BG_KEY, "/landing/bg.png");
  }
}

/** Full-viewport landing background with vignette — matches React hub. */
export function createLandingBackdrop(
  scene: Phaser.Scene,
  depth = 0,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(depth);

  if (scene.textures.exists(LANDING_BG_KEY)) {
    const bg = scene.add.image(width / 2, height / 2, LANDING_BG_KEY);
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setAlpha(0.92);
    container.add(bg);
  } else {
    container.add(scene.add.rectangle(width / 2, height / 2, width, height, C.void));
  }

  const vignette = scene.add.rectangle(width / 2, height / 2, width, height, 0x030205, 0.55);
  container.add(vignette);

  const floorFade = scene.add.rectangle(width / 2, height * 0.82, width, height * 0.45, C.void, 0.75);
  container.add(floorFade);

  return container;
}

import Phaser from "phaser";
import { C } from "../theme.js";

export const LANDING_BG_KEY = "landing-bg";
export const LANDING_CHARACTER_KEY = "landing-character";
export const LANDING_LOGO_KEY = "landing-logo";

export function preloadHubLogo(scene: Phaser.Scene): void {
  if (!scene.textures.exists(LANDING_LOGO_KEY)) {
    scene.load.image(LANDING_LOGO_KEY, "/landing/logo.png");
  }
}

export function preloadLandingBackdrop(scene: Phaser.Scene): void {
  if (!scene.textures.exists(LANDING_BG_KEY)) {
    scene.load.image(LANDING_BG_KEY, "/landing/bg.png");
  }
  if (!scene.textures.exists(LANDING_CHARACTER_KEY)) {
    scene.load.image(LANDING_CHARACTER_KEY, "/landing/character.png");
  }
  preloadHubLogo(scene);
}

/** Hub / duel header logo — scales to maxWidth, falls back to text if missing. */
export function addHubLogo(
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  maxWidth: number,
  depth = 11,
): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
  if (scene.textures.exists(LANDING_LOGO_KEY)) {
    const logo = scene.add
      .image(centerX, y, LANDING_LOGO_KEY)
      .setOrigin(0.5, 0)
      .setDepth(depth);
    logo.setScale(maxWidth / logo.width);
    return logo;
  }

  return scene.add
    .text(centerX, y, "ZEGON", {
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
      fontSize: `${Math.round(maxWidth * 0.22)}px`,
      color: "#FF4D2E",
      letterSpacing: 4,
    })
    .setOrigin(0.5, 0)
    .setDepth(depth);
}

/** Full-viewport landing background with vignette — matches React hub. */
export function createLandingBackdrop(
  scene: Phaser.Scene,
  depth = 0,
  options?: { duel?: boolean },
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(depth);
  const duel = options?.duel ?? false;

  if (scene.textures.exists(LANDING_BG_KEY)) {
    const bg = scene.add.image(width / 2, height / 2, LANDING_BG_KEY);
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale * (duel ? 1.02 : 1)).setAlpha(duel ? 0.98 : 0.92);
    if (duel) {
      bg.setOrigin(0.5, 0.48);
    }
    container.add(bg);
  } else {
    container.add(scene.add.rectangle(width / 2, height / 2, width, height, C.void));
  }

  // Vignette oscurece el paisaje — omitida en duelo para no tapar a ZEGON.
  if (!duel) {
    const vignette = scene.add.rectangle(width / 2, height / 2, width, height, 0x030205, 0.55);
    container.add(vignette);
  }

  const floorAlpha = duel ? 0.28 : 0.75;
  const floorFade = scene.add.rectangle(width / 2, height * 0.82, width, height * 0.45, C.void, floorAlpha);
  container.add(floorFade);

  return container;
}

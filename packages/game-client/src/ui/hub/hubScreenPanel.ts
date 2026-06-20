import Phaser from "phaser";
import { createHubPanelGraphics } from "./hubPanel.js";

/** Centered hub panel container for menu / result screens. */
export function createHubScreenPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 0,
): Phaser.GameObjects.Container {
  const panel = createHubPanelGraphics(scene, w, h);
  return scene.add.container(x, y, [panel]).setDepth(depth);
}

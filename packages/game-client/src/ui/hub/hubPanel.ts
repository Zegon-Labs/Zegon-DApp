import Phaser from "phaser";
import { C } from "../theme.js";

/** Hub-style panel fill + blood border (no cyan). */
export function paintHubPanel(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
): void {
  const hw = w / 2;
  const hh = h / 2;
  const r = 4;

  g.clear();
  g.fillStyle(C.ash, 0.96);
  g.fillRoundedRect(-hw, -hh, w, h, r);
  g.lineStyle(2, C.blood, 0.9);
  g.strokeRoundedRect(-hw, -hh, w, h, r);
  g.lineStyle(1, C.ember, 0.22);
  g.strokeRoundedRect(-hw + 2, -hh + 2, w - 4, h - 4, 3);
}

export function createHubPanelGraphics(
  scene: Phaser.Scene,
  w: number,
  h: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  paintHubPanel(g, w, h);
  return g;
}

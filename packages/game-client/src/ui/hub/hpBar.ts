import Phaser from "phaser";
import { C } from "../theme.js";

/** Hub-styled HP bar — same look for player and ZEGON. */
export function drawHubHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
): void {
  const ratio = Math.max(0, Math.min(1, current / max));
  g.fillStyle(C.ash, 0.92);
  g.fillRect(x, y, w, h);
  g.fillStyle(C.blood, 1);
  g.fillRect(x, y, w * ratio, h);
  g.lineStyle(1, C.blood, 0.75);
  g.strokeRect(x, y, w, h);
}

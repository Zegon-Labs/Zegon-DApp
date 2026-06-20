import Phaser from "phaser";
import { COLORS, FONT } from "./theme.js";

export function showFloatingDamage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  _target: "player" | "zegon",
): void {
  const prefix = amount > 0 ? "−" : "+";
  const color = COLORS.blood;
  const text = scene.add
    .text(x, y, `${prefix}${Math.abs(amount)} HP`, {
      fontFamily: FONT,
      fontSize: "22px",
      color,
      stroke: "#0A0911",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(30);

  scene.tweens.add({
    targets: text,
    y: y - 48,
    alpha: 0,
    duration: 900,
    ease: "Cubic.Out",
    onComplete: () => text.destroy(),
  });
}

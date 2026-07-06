import Phaser from "phaser";
import { COLORS, FONT } from "./theme.js";
import { formatLivesLost } from "./damageLives.js";
import { t } from "../i18n/index.js";

export function showFloatingDamage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  target: "player" | "zegon",
  maxHp = 100,
): void {
  const strings = t();
  const label = formatLivesLost(
    amount,
    strings.lifeSingular,
    strings.lifePlural,
    maxHp,
  );
  const color = target === "player" ? COLORS.blood : COLORS.verified;
  const fontSize = target === "zegon" ? "26px" : "22px";

  const text = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize,
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
    scale: target === "zegon" ? 1.15 : 1,
    duration: 900,
    ease: "Cubic.Out",
    onComplete: () => text.destroy(),
  });
}

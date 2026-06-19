import Phaser from "phaser";
import { C, COLORS, FONT } from "./theme.js";

export function drawScanlines(
  scene: Phaser.Scene,
  depth = 100,
  alpha = 0.06,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth).setAlpha(alpha);
  const { width, height } = scene.scale;
  g.lineStyle(1, C.fog, 0.35);
  for (let y = 0; y < height; y += 4) {
    g.lineBetween(0, y, width, y);
  }
  return g;
}

export function drawDesertBackdrop(
  scene: Phaser.Scene,
  intensity = 0,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(0);

  const sky = scene.add.rectangle(width / 2, height * 0.35, width, height * 0.7, C.void);
  const horizon = scene.add.rectangle(width / 2, height * 0.62, width, height * 0.5, 0x1a0810);
  const ground = scene.add.rectangle(width / 2, height * 0.82, width, height * 0.4, 0x120a0e);

  const sun = scene.add.circle(width / 2, height * 0.38, 90, C.blood, 0.25 + intensity * 0.35);

  const mesaLeft = scene.add.triangle(
    width * 0.18, height * 0.58, 0, 40, 50, 0, 100, 40, 0x0d080c, 1,
  );
  const mesaRight = scene.add.triangle(
    width * 0.82, height * 0.55, 0, 50, 60, 0, 120, 50, 0x0d080c, 1,
  );

  container.add([sky, horizon, ground, sun, mesaLeft, mesaRight]);
  return container;
}

export function drawZegonFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  blindsight: number,
  deadeye = false,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(5);
  const glow = 0.4 + (blindsight / 100) * 0.6;

  const body = scene.add.rectangle(0, 30, 70, 100, C.ash);
  const coat = scene.add.triangle(0, 35, -55, -20, 55, -20, 0, 90, C.void, 0.95);
  const hat = scene.add.ellipse(0, -45, 90, 22, C.void);
  const hatTop = scene.add.rectangle(0, -58, 44, 28, C.void);
  const bandage = scene.add.rectangle(0, -18, 36, 50, C.smoke);
  const eye = scene.add.rectangle(0, -18, 4, 36, deadeye ? C.ember : C.blood, glow);

  container.add([body, coat, hat, hatTop, bandage, eye]);

  if (blindsight > 50) {
    const crack = scene.add.graphics();
    crack.lineStyle(2, C.ember, glow);
    crack.lineBetween(-2, -34, 2, -2);
    container.add(crack);
  }

  return container;
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 10,
): Phaser.GameObjects.Container {
  const bg = scene.add.rectangle(w / 2, h / 2, w, h, C.ash, 0.92);
  bg.setStrokeStyle(1, C.fog);
  return scene.add.container(x, y, [bg]).setDepth(depth);
}

export function createLabeledPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  depth = 10,
): { container: Phaser.GameObjects.Container; body: Phaser.GameObjects.Text } {
  const panel = createPanel(scene, x, y, w, h, depth);
  const titleText = scene.add.text(10, 6, title, {
    fontFamily: FONT,
    fontSize: "14px",
    color: COLORS.ember,
  });
  const body = scene.add.text(10, 26, "", {
    fontFamily: FONT,
    fontSize: "15px",
    color: COLORS.dust,
    lineSpacing: 3,
  });
  panel.add([titleText, body]);
  return { container: panel, body };
}

export function createActionButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  depth = 10,
): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.95);
  bg.setStrokeStyle(1, C.fog);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.dust,
    align: "center",
    wordWrap: { width: w - 8 },
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  bg.setInteractive({ useHandCursor: true });

  bg.on("pointerover", () => {
    bg.setStrokeStyle(2, 0x2ee6d6);
    text.setColor(COLORS.bone);
  });
  bg.on("pointerout", () => {
    bg.setStrokeStyle(1, C.fog);
    text.setColor(COLORS.dust);
  });
  bg.on("pointerdown", onClick);

  return { container, bg, text };
}

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const w = 260;
  const h = 42;
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.95);
  bg.setStrokeStyle(2, C.blood);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "26px",
    color: COLORS.bone,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => {
    bg.setFillStyle(C.blood, 0.35);
    bg.setStrokeStyle(2, C.cyan);
    text.setColor(COLORS.cyan);
  });
  bg.on("pointerout", () => {
    bg.setFillStyle(C.smoke, 0.95);
    bg.setStrokeStyle(2, C.blood);
    text.setColor(COLORS.bone);
  });
  bg.on("pointerdown", onClick);
  return container;
}

export function drawBlindsightMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
): void {
  const fill = (value / 100) * w;
  g.clear();
  g.fillStyle(C.smoke, 0.95);
  g.fillRect(x, y, w, h);
  g.fillStyle(C.ember, 1);
  g.fillRect(x, y, fill, h);
  g.lineStyle(1, C.fog, 1);
  g.strokeRect(x, y, w, h);
}

export function drawHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
  color: number,
): void {
  const ratio = Math.max(0, Math.min(1, current / max));
  g.fillStyle(C.smoke, 0.9);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, 1);
  g.fillRect(x, y, w * ratio, h);
  g.lineStyle(1, C.fog, 1);
  g.strokeRect(x, y, w, h);
}

export function drawDivider(scene: Phaser.Scene, y: number): void {
  const { width } = scene.scale;
  const g = scene.add.graphics().setDepth(4);
  g.lineStyle(1, C.fog, 0.5);
  g.lineBetween(24, y, width - 24, y);
}

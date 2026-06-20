import Phaser from "phaser";
import { C } from "../theme.js";

/** Crosshair corner accents — mockup panel style. */
export function paintDuelFrameCorners(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  len = 10,
  color = C.blood,
  alpha = 0.85,
): void {
  g.lineStyle(1, color, alpha);
  const corners: Array<[number, number, number, number, number, number]> = [
    [x, y + len, x, y, x + len, y],
    [x + w - len, y, x + w, y, x + w, y + len],
    [x, y + h - len, x, y + h, x + len, y + h],
    [x + w - len, y + h, x + w, y + h, x + w, y + h - len],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of corners) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.strokePath();
  }
}

export function drawSegmentedMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  segments = 10,
  fillColor = C.ember,
  emptyColor = C.fog,
): void {
  g.clear();
  const gap = 3;
  const segW = (w - gap * (segments - 1)) / segments;
  const filled = Math.round((value / 100) * segments);
  for (let i = 0; i < segments; i++) {
    const sx = x + i * (segW + gap);
    g.fillStyle(i < filled ? fillColor : emptyColor, i < filled ? 1 : 0.45);
    g.fillRect(sx, y, segW, h);
  }
  g.lineStyle(1, C.blood, 0.65);
  g.strokeRect(x - 1, y - 1, w + 2, h + 2);
}

export function drawHeartIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  filled: boolean,
): void {
  g.fillStyle(filled ? C.blood : C.fog, filled ? 1 : 0.35);
  const s = size * 0.5;
  g.fillCircle(cx - s * 0.45, cy - s * 0.15, s * 0.42);
  g.fillCircle(cx + s * 0.45, cy - s * 0.15, s * 0.42);
  g.fillTriangle(cx - s * 0.92, cy, cx + s * 0.92, cy, cx, cy + s * 1.05);
}

export function drawSkullIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  filled: boolean,
): void {
  const s = size * 0.5;
  g.fillStyle(filled ? C.blood : C.fog, filled ? 1 : 0.35);
  g.fillCircle(cx, cy - s * 0.1, s * 0.72);
  g.fillRect(cx - s * 0.55, cy + s * 0.35, s * 1.1, s * 0.45);
  g.fillStyle(C.void, filled ? 0.9 : 0.5);
  g.fillCircle(cx - s * 0.28, cy - s * 0.12, s * 0.16);
  g.fillCircle(cx + s * 0.28, cy - s * 0.12, s * 0.16);
}

export function drawBulletIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  filled: boolean,
): void {
  const s = size * 0.5;
  g.fillStyle(filled ? C.bone : C.fog, filled ? 1 : 0.35);
  g.fillRect(cx - s * 0.18, cy - s * 0.55, s * 0.36, s * 1.1);
  g.fillTriangle(cx - s * 0.28, cy - s * 0.55, cx + s * 0.28, cy - s * 0.55, cx, cy - s * 0.95);
}

export function drawActionIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  action: string,
  color: number,
  size = 14,
): void {
  g.lineStyle(2, color, 1);
  const s = size * 0.5;
  if (action === "FIRE_HIGH" || action === "FIRE_LOW") {
    g.fillStyle(color, 1);
    g.fillRect(cx - s * 0.15, cy - s * 0.5, s * 0.3, s);
    g.fillTriangle(cx - s * 0.22, cy - s * 0.5, cx + s * 0.22, cy - s * 0.5, cx, cy - s * 0.85);
  } else if (action === "DODGE") {
    g.strokeTriangle(cx - s, cy + s * 0.2, cx + s, cy + s * 0.2, cx, cy - s * 0.7);
  } else if (action === "FEINT") {
    g.lineBetween(cx - s * 0.6, cy - s * 0.6, cx + s * 0.6, cy + s * 0.6);
    g.lineBetween(cx + s * 0.6, cy - s * 0.6, cx - s * 0.6, cy + s * 0.6);
  } else if (action === "RELOAD") {
    g.strokeRect(cx - s * 0.35, cy - s * 0.55, s * 0.7, s * 1.1);
    g.lineBetween(cx - s * 0.15, cy - s * 0.2, cx + s * 0.15, cy - s * 0.2);
  }
}

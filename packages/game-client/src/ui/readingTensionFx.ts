import Phaser from "phaser";
import { C } from "./theme.js";
import type { BlindsightShakeParams } from "./components.js";

export interface ReadingTensionState {
  /** 0–100 blindsight meter value. */
  blindsight: number;
  /** True when deadeye threshold is met. */
  deadeye: boolean;
  /** Animation phase (radians-ish accumulator). */
  phase: number;
  /** Master toggle from settings. */
  enabled: boolean;
}

/**
 * Racha 1 — soft edge vignette.
 * Deadeye — full-screen red breathing wash + stronger camera shake (see deadeyeShakeParams).
 */
export class ReadingTensionLayer {
  readonly container: Phaser.GameObjects.Container;
  private readonly vignette: Phaser.GameObjects.Graphics;
  private readonly redWash: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, depth = 97) {
    const { width, height } = scene.scale;
    this.container = scene.add.container(0, 0).setDepth(depth);
    this.vignette = scene.add.graphics();
    this.redWash = scene.add
      .rectangle(width / 2, height / 2, width, height, C.blood, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.container.add([this.vignette, this.redWash]);
    this.container.setAlpha(0);
  }

  update(state: ReadingTensionState): void {
    const i = Phaser.Math.Clamp(state.blindsight / 100, 0, 1);
    if (!state.enabled || (i < 0.05 && !state.deadeye)) {
      this.container.setAlpha(0);
      this.vignette.clear();
      this.redWash.setAlpha(0);
      return;
    }

    const { width, height } = this.container.scene.scale;
    const cx = width / 2;
    const cy = height / 2;

    if (state.deadeye) {
      this.drawEdgeVignette(width, height, cx, cy, Math.max(i, 0.45), true);
      const breath = 0.62 + 0.38 * Math.abs(Math.sin(state.phase * 1.8));
      const redAlpha = (0.025 + i * 0.07) * breath;
      this.redWash.setAlpha(redAlpha);
      this.container.setAlpha(1);
    } else {
      this.drawEdgeVignette(width, height, cx, cy, i, false);
      this.redWash.setAlpha(0);
      this.container.setAlpha(0.18 + i * 0.62);
    }
  }

  /** Darkens corners only — no warm blob or reticle in the centre. */
  private drawEdgeVignette(
    width: number,
    height: number,
    cx: number,
    cy: number,
    intensity: number,
    deadeye: boolean,
  ): void {
    const g = this.vignette;
    g.clear();

    const tight = intensity * (deadeye ? 0.38 : 0.24);
    const innerR = Math.min(width, height) * (0.54 - tight);
    const outerR = Math.hypot(width, height) * 0.72;

    const rings = 14;
    for (let r = rings; r >= 1; r--) {
      const t = r / rings;
      const alpha = (0.025 + intensity * 0.12) * t * t;
      g.fillStyle(C.void, alpha);
      g.fillCircle(cx, cy, innerR + (outerR - innerR) * t);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

/** Gentle camera vibration while deadeye is active. */
export function deadeyeShakeParams(blindsight: number): BlindsightShakeParams {
  const t = Phaser.Math.Clamp(blindsight / 100, 0.35, 1);
  return {
    intervalMs: 920 - t * 280,
    durationMs: 65 + t * 35,
    intensity: 0.001 + t * 0.0014,
  };
}

/** @deprecated Use ReadingTensionLayer — kept for legacy imports. */
export function drawBlindsightTensionOverlay(
  scene: Phaser.Scene,
  intensity: number,
  depth = 99,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(depth);
  container.setAlpha(intensity > 0.02 ? 0.3 + intensity * 0.4 : 0);
  return container;
}

export function blindsightBlinkAlpha(_blindsight: number, _phase: number): number {
  return 0;
}

export function scanlinePulseAlpha(
  blindsight: number,
  _phase: number,
  scanlinesEnabled: boolean,
): number {
  if (!scanlinesEnabled) return 0;
  return 0.035 + (blindsight / 100) * 0.04;
}

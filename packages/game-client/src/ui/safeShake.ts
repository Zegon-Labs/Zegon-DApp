import Phaser from "phaser";
import { getPreferences } from "../services/preferences.js";

/** Min gap between camera shakes so stacked impacts don't compound. */
const SHAKE_COOLDOWN_MS = 250;

let lastShakeAt = 0;

/**
 * Camera shake gated by user preferences (screenShake / reducedMotion)
 * and a global cooldown. All gameplay shakes should go through here.
 */
export function safeShake(
  scene: Phaser.Scene,
  durationMs: number,
  intensity: number,
): void {
  const prefs = getPreferences();
  if (!prefs.screenShake || prefs.reducedMotion) return;

  const now = Date.now();
  if (now - lastShakeAt < SHAKE_COOLDOWN_MS) return;
  lastShakeAt = now;

  scene.cameras.main.shake(durationMs, intensity);
}

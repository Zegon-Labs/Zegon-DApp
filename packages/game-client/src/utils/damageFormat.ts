import { COMBAT } from "@zegon/game-core";

/**
 * Express raw HP damage in life units (1.0 = one life slot / skull).
 * e.g. 22 HP → "1.1", 25 HP → "1.25", 20 HP → "1.0".
 */
export function shotDamageMultiplierLabel(shotDamage: number): string {
  const mult = Math.round((shotDamage / COMBAT.HIT_DAMAGE) * 100) / 100;
  return mult.toFixed(2).replace(/(\.\d)0$/, "$1");
}

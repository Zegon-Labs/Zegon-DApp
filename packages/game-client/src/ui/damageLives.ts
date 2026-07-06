import { COMBAT } from "@zegon/game-core";

const DEFAULT_SLOTS = 5;

/**
 * HP damage → lives lost, fractional (1 life = one heart/skull slot).
 * Matches the HUD slot math (maxHp / 5 per slot), so a ×1.1 shot reads
 * "−1.1 lives" instead of overstating "−2 lives" while only 1 slot drops.
 */
export function damageToLives(
  damage: number,
  maxHp: number = COMBAT.INITIAL_HP,
  slots: number = DEFAULT_SLOTS,
): number {
  if (damage <= 0) return 0;
  const perLife = maxHp / slots;
  return Math.round((damage / perLife) * 100) / 100;
}

/** "1.1" · "1" · "0.5" — trims trailing zeros. */
export function livesLabel(lives: number): string {
  return lives.toFixed(2).replace(/\.?0+$/, "");
}

export function formatLivesLost(
  damage: number,
  lifeWord: string,
  livesWord: string,
  maxHp: number = COMBAT.INITIAL_HP,
  slots = DEFAULT_SLOTS,
): string {
  const lives = damageToLives(damage, maxHp, slots);
  const word = lives === 1 ? lifeWord : livesWord;
  return `−${livesLabel(lives)} ${word}`;
}

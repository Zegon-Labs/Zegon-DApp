import { COMBAT } from "@zegon/game-core";

const DEFAULT_SLOTS = 5;

/** HP damage → lives lost (1 normal hit = 1 heart). */
export function damageToLives(
  damage: number,
  maxHp = COMBAT.INITIAL_HP,
  slots = DEFAULT_SLOTS,
): number {
  if (damage <= 0) return 0;
  const perLife = maxHp / slots;
  return Math.max(1, Math.ceil(damage / perLife));
}

export function formatLivesLost(
  damage: number,
  lifeWord: string,
  livesWord: string,
  maxHp = COMBAT.INITIAL_HP,
  slots = DEFAULT_SLOTS,
): string {
  const lives = damageToLives(damage, maxHp, slots);
  const word = lives === 1 ? lifeWord : livesWord;
  return `−${lives} ${word}`;
}

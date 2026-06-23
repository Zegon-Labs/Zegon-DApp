import type { DuelConfig } from "../types/index.js";

/** Mix a per-duel nonce into config.seed so round-0 RNG is not identical every match. */
export function withUniqueDuelSeed(config: DuelConfig, duelId: string): DuelConfig {
  const base = config.seed?.trim();
  const token = duelId.slice(0, 16);
  return {
    ...config,
    seed: base ? `${base}-${token}` : token,
  };
}

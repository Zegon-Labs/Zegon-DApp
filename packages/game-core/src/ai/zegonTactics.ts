import {
  ALL_ZEGON_ACTIONS,
  PlayerAction,
  RoundContext,
  ZegonAction,
} from "../types/index.js";

export function createRng(seed?: string): () => number {
  if (!seed) {
    return Math.random;
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Per-round RNG stream — avoids reusing the first draws of a duel seed every round. */
export function createRoundRng(baseSeed: string | undefined, ctx: RoundContext): () => number {
  if (!baseSeed) return Math.random;
  return createRng(`${baseSeed}:r${ctx.roundIndex}:h${ctx.playerHistory.length}`);
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const PLAYER_ALIASES: Record<string, PlayerAction> = {
  FIRE: PlayerAction.FIRE,
  SHOOT: PlayerAction.FIRE,
  DISPARAR: PlayerAction.FIRE,
  DODGE: PlayerAction.DODGE,
  ESQUIVAR: PlayerAction.DODGE,
  USE_ITEM: PlayerAction.USE_ITEM,
  ITEM: PlayerAction.USE_ITEM,
};

const ZEGON_ALIASES: Record<string, ZegonAction> = {
  FIRE: ZegonAction.FIRE,
  SHOOT: ZegonAction.FIRE,
  DISPARAR: ZegonAction.FIRE,
  DODGE: ZegonAction.DODGE,
  ESQUIVAR: ZegonAction.DODGE,
};

export function normalizePlayerAction(raw: unknown): PlayerAction | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return PLAYER_ALIASES[key] ?? null;
}

export function normalizeZegonAction(raw: unknown): ZegonAction | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return ZEGON_ALIASES[key] ?? null;
}

/**
 * Tactical counter-move given a predicted player action.
 * Mixes dodge and fire so ZEGON is not stuck on FIRE every round.
 */
export function pickZegonMove(
  predicted: PlayerAction,
  ctx: RoundContext,
  rng: () => number,
  confidence = 0.5,
): ZegonAction {
  if (ctx.isDeadeye) {
    if (ctx.archetype === "gambler" && rng() < 0.12) {
      return ZegonAction.DODGE;
    }
    return ZegonAction.FIRE;
  }

  const dodgeBias = ctx.modifiers?.zegonDodgeBias ?? 0;
  const confBoost = Math.min(0.12, (confidence - 0.4) * 0.2);
  const roundAggro = ctx.roundIndex >= 8 ? 0.06 : 0;

  let move: ZegonAction;
  if (predicted === PlayerAction.FIRE) {
    const dodgeChance = Math.min(0.78, 0.48 + dodgeBias + confBoost - roundAggro);
    move = rng() < dodgeChance ? ZegonAction.DODGE : ZegonAction.FIRE;
  } else if (predicted === PlayerAction.DODGE) {
    const fireChance = Math.min(0.82, 0.62 + dodgeBias * 0.12 + confBoost + roundAggro);
    move = rng() < fireChance ? ZegonAction.FIRE : ZegonAction.DODGE;
  } else if (predicted === PlayerAction.USE_ITEM) {
    move = rng() < 0.62 + confBoost ? ZegonAction.FIRE : ZegonAction.DODGE;
  } else {
    move = pickRandom(ALL_ZEGON_ACTIONS, rng);
  }

  if (ctx.archetype === "phantom" && confidence >= 0.65 && rng() < 0.2) {
    move = ZegonAction.DODGE;
  }

  if (ctx.archetype === "gambler" && rng() < 0.25) {
    move = pickRandom(ALL_ZEGON_ACTIONS, rng);
  }

  return move;
}

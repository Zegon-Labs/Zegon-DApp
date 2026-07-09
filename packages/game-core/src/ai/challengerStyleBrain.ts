import {
  ALL_PLAYER_ACTIONS,
  ChallengerStyleProfile,
  PlayerAction,
  RoundContext,
  ZegonDecision,
} from "../types/index.js";
import { DummyZegonBrain } from "./dummyZegonBrain.js";
import { createRoundRng, pickZegonMove } from "./zegonTactics.js";

const STYLE_WEIGHT = 0.35;

function pickStyleAction(
  style: ChallengerStyleProfile,
  ctx: RoundContext,
): PlayerAction | null {
  const historical = style.rounds.find((r) => r.roundIndex === ctx.roundIndex);
  if (historical?.playerAction) return historical.playerAction;

  const entries = Object.entries(style.actionFreq ?? {}) as [PlayerAction, number][];
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

export class ChallengerStyleBrain extends DummyZegonBrain {
  constructor(
    seed: string | undefined,
    private readonly style: ChallengerStyleProfile,
    locale: "en" | "es" = "en",
  ) {
    super(seed, locale);
  }

  async decide(ctx: RoundContext): Promise<ZegonDecision> {
    const base = await super.decide(ctx);
    const rng = createRoundRng(undefined, ctx);
    if (rng() > STYLE_WEIGHT) return base;

    const styleAction = pickStyleAction(this.style, ctx);
    if (!styleAction || !ALL_PLAYER_ACTIONS.includes(styleAction)) {
      return base;
    }

    return {
      ...base,
      predictedPlayerMove: styleAction,
      zegonMove: pickZegonMove(styleAction, ctx, rng),
      confidence: Math.min(0.92, base.confidence + 0.12),
    };
  }
}

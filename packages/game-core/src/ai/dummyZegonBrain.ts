import {
  ALL_PLAYER_ACTIONS,
  RoundContext,
  ZegonDecision,
} from "../types/index.js";
import { IZegonBrain } from "./IZegonBrain.js";
import { analyzePlayerPattern } from "./patternAnalyzer.js";
import { createRoundRng, pickZegonMove } from "./zegonTactics.js";

export type BrainLocale = "en" | "es";

const TAUNTS: Record<BrainLocale, { high: string[]; mid: string[]; low: string[] }> = {
  en: {
    high: [
      "I smell your pattern, stranger.",
      "The blindfold cracks. I see your rhythm.",
      "Same move twice? Predictable.",
      "Your rhythm is a dead man's march.",
    ],
    mid: [
      "Your soul whispers.",
      "Interesting... but not enough.",
      "The dust remembers your steps.",
      "A flicker — not yet a flame.",
    ],
    low: [
      "Silence. Good.",
      "Nothing to read yet.",
      "The void gives nothing away.",
      "Chaos suits you. For now.",
    ],
  },
  es: {
    high: [
      "Huelo tu patrón, forastero.",
      "La venda se agrieta. Veo tu ritmo.",
      "¿La misma jugada otra vez? Predecible.",
      "Tu ritmo es un paso de muerto.",
    ],
    mid: [
      "Tu alma susurra.",
      "Interesante... pero no basta.",
      "El polvo recuerda tus pasos.",
      "Un destello — aún no es llama.",
    ],
    low: [
      "Silencio. Bien.",
      "Nada que leer aún.",
      "El vacío no revela nada.",
      "El caos te favorece. Por ahora.",
    ],
  },
};

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function tauntForConfidence(
  confidence: number,
  rng: () => number,
  locale: BrainLocale,
): string {
  const pool = TAUNTS[locale];
  if (confidence >= 0.7) {
    return pickRandom(pool.high, rng);
  }
  if (confidence >= 0.4) {
    return pickRandom(pool.mid, rng);
  }
  return pickRandom(pool.low, rng);
}

export class DummyZegonBrain implements IZegonBrain {
  private baseSeed?: string;
  private readonly locale: BrainLocale;

  constructor(seed?: string, locale: BrainLocale = "en") {
    this.baseSeed = seed;
    this.locale = locale;
  }

  setSeed(seed?: string): void {
    this.baseSeed = seed;
  }

  async decide(ctx: RoundContext): Promise<ZegonDecision> {
    const rng = createRoundRng(this.baseSeed, ctx);

    if (ctx.archetype === "gambler" && rng() < 0.25) {
      const randomPred = pickRandom(ALL_PLAYER_ACTIONS, rng);
      return {
        predictedPlayerMove: randomPred,
        zegonMove: pickZegonMove(randomPred, ctx, rng),
        confidence: 0.15 + rng() * 0.25,
        taunt: tauntForConfidence(0.3, rng, this.locale),
      };
    }

    const analysis = analyzePlayerPattern(ctx, rng);
    let predicted = analysis.action;
    let confidence = analysis.confidence;

    if (ctx.archetype === "deadeye" && (ctx.timesReadSoFar ?? 0) >= 2) {
      confidence = Math.min(0.95, confidence + 0.12);
    }

    const zegonMove = pickZegonMove(predicted, ctx, rng, confidence);
    const taunt = tauntForConfidence(confidence, rng, this.locale);

    return {
      predictedPlayerMove: predicted,
      zegonMove,
      confidence,
      taunt,
    };
  }
}

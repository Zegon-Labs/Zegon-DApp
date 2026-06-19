import {
  ALL_PLAYER_ACTIONS,
  ALL_ZEGON_ACTIONS,
  PlayerAction,
  RoundContext,
  ZegonAction,
  ZegonDecision,
} from "../types/index.js";
import { IZegonBrain } from "./IZegonBrain.js";

export type BrainLocale = "en" | "es";

const TAUNTS: Record<BrainLocale, { high: string[]; mid: string[]; low: string[] }> = {
  en: {
    high: [
      "I smell your pattern, stranger.",
      "The blindfold cracks. I see your rhythm.",
      "Same move twice? Predictable.",
    ],
    mid: [
      "Your soul whispers.",
      "Interesting... but not enough.",
      "The dust remembers your steps.",
    ],
    low: [
      "Silence. Good.",
      "Nothing to read yet.",
      "The void gives nothing away.",
    ],
  },
  es: {
    high: [
      "Huelo tu patrón, forastero.",
      "La venda se agrieta. Veo tu ritmo.",
      "¿La misma jugada otra vez? Predecible.",
    ],
    mid: [
      "Tu alma susurra.",
      "Interesante... pero no basta.",
      "El polvo recuerda tus pasos.",
    ],
    low: [
      "Silencio. Bien.",
      "Nada que leer aún.",
      "El vacío no revela nada.",
    ],
  },
};

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function createRng(seed?: string): () => number {
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

function detectPattern(
  history: readonly PlayerAction[],
  windowSize = 5,
): { action: PlayerAction; frequency: number } | null {
  if (history.length === 0) {
    return null;
  }

  const window = history.slice(-windowSize);
  const counts = new Map<PlayerAction, number>();

  for (const action of window) {
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }

  let best: PlayerAction | null = null;
  let bestCount = 0;

  for (const [action, count] of counts) {
    if (count > bestCount) {
      best = action;
      bestCount = count;
    }
  }

  if (!best) {
    return null;
  }

  return { action: best, frequency: bestCount / window.length };
}

function counterMove(predicted: PlayerAction, rng: () => number): ZegonAction {
  if (
    predicted === PlayerAction.FIRE_HIGH ||
    predicted === PlayerAction.FIRE_LOW
  ) {
    return rng() > 0.5 ? ZegonAction.DODGE : ZegonAction.FIRE_LOW;
  }
  if (predicted === PlayerAction.DODGE) {
    return ZegonAction.FIRE_HIGH;
  }
  if (predicted === PlayerAction.RELOAD) {
    return ZegonAction.FIRE_HIGH;
  }
  return pickRandom(ALL_ZEGON_ACTIONS, rng);
}

function confidenceFromFrequency(frequency: number): number {
  return Math.min(1, Math.max(0.2, frequency));
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
  private readonly rng: () => number;
  private readonly locale: BrainLocale;

  constructor(seed?: string, locale: BrainLocale = "en") {
    this.rng = createRng(seed);
    this.locale = locale;
  }

  async decide(ctx: RoundContext): Promise<ZegonDecision> {
    const pattern = detectPattern(ctx.playerHistory);

    let predicted: PlayerAction;
    let confidence: number;

    if (!pattern || ctx.playerHistory.length < 2) {
      predicted = pickRandom(ALL_PLAYER_ACTIONS, this.rng);
      confidence = 0.2 + this.rng() * 0.2;
    } else {
      predicted = pattern.action;
      confidence = confidenceFromFrequency(pattern.frequency);
    }

    const zegonMove = counterMove(predicted, this.rng);
    const taunt = tauntForConfidence(confidence, this.rng, this.locale);

    return {
      predictedPlayerMove: predicted,
      zegonMove,
      confidence,
      taunt,
    };
  }
}

import { DuelItemId, PlayerAction, RoundContext } from "../types/index.js";

export interface PatternPrediction {
  action: PlayerAction;
  confidence: number;
  hints: {
    frequency?: PlayerAction;
    markov?: PlayerAction;
    alternation?: PlayerAction;
    itemBias?: PlayerAction;
    roundShift?: PlayerAction;
  };
}

const COMBAT_ACTIONS: PlayerAction[] = [PlayerAction.FIRE, PlayerAction.DODGE];

const ALL_PLAYER_ACTIONS: PlayerAction[] = [
  PlayerAction.FIRE,
  PlayerAction.DODGE,
  PlayerAction.USE_ITEM,
];

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function detectFrequency(
  history: readonly PlayerAction[],
  windowSize = 8,
): { action: PlayerAction; frequency: number } | null {
  if (history.length === 0) return null;

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
  if (!best) return null;
  return { action: best, frequency: bestCount / window.length };
}

function detectAlternation(history: readonly PlayerAction[]): {
  isAlternating: boolean;
  nextInCycle: PlayerAction | null;
  breakAction: PlayerAction | null;
} {
  const combat = history.filter((a) => COMBAT_ACTIONS.includes(a));
  if (combat.length < 3) {
    return { isAlternating: false, nextInCycle: null, breakAction: null };
  }

  const tail = combat.slice(-4);
  let alternating = true;
  for (let i = 1; i < tail.length; i++) {
    if (tail[i] === tail[i - 1]) {
      alternating = false;
      break;
    }
  }

  if (!alternating) {
    return { isAlternating: false, nextInCycle: null, breakAction: null };
  }

  const last = tail[tail.length - 1]!;
  const nextInCycle = last === PlayerAction.FIRE ? PlayerAction.DODGE : PlayerAction.FIRE;
  return { isAlternating: true, nextInCycle, breakAction: last };
}

function markovPredict(history: readonly PlayerAction[]): PlayerAction | null {
  if (history.length < 2) return null;

  const a = history[history.length - 2]!;
  const b = history[history.length - 1]!;

  const transitions = new Map<PlayerAction, number>();
  for (let i = 2; i < history.length; i++) {
    if (history[i - 2] === a && history[i - 1] === b) {
      const next = history[i]!;
      transitions.set(next, (transitions.get(next) ?? 0) + 1);
    }
  }

  if (transitions.size === 0) return null;

  let best: PlayerAction | null = null;
  let bestCount = 0;
  for (const [action, count] of transitions) {
    if (count > bestCount) {
      best = action;
      bestCount = count;
    }
  }
  return best;
}

function itemUsageBias(
  history: readonly PlayerAction[],
  itemHistory: readonly DuelItemId[] | undefined,
): PlayerAction | null {
  if (!itemHistory?.length) return null;

  const lastItemRound = itemHistory.length - 1;
  const roundsSinceItem = history.length - 1 - lastItemRound;
  if (roundsSinceItem >= 0 && roundsSinceItem <= 2) {
    return PlayerAction.FIRE;
  }

  const smokeCount = itemHistory.filter((id) => id === DuelItemId.SMOKE).length;
  if (smokeCount >= 2 && history[history.length - 1] === PlayerAction.USE_ITEM) {
    return PlayerAction.FIRE;
  }

  return null;
}

function historyHash(history: readonly PlayerAction[]): number {
  let h = 0;
  for (const a of history) {
    h = (h * 31 + a.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

function roundPersonalityShift(
  ctx: RoundContext,
  rng: () => number,
): PlayerAction {
  const roll = (ctx.roundIndex * 17 + historyHash(ctx.playerHistory)) % 100;
  if (roll < 35) return PlayerAction.FIRE;
  if (roll < 70) return PlayerAction.DODGE;
  return pickRandom(COMBAT_ACTIONS, rng);
}

function lateRoundConfidenceBoost(ctx: RoundContext, confidence: number): number {
  let boost = 0;
  if (ctx.roundIndex >= 6) boost += 0.08;
  if (ctx.roundIndex >= 10) boost += 0.06;
  if (ctx.archetype === "reader") boost += 0.05;
  return Math.min(0.95, confidence + boost);
}

function itemRepeatBias(ctx: RoundContext): PlayerAction | null {
  if (ctx.itemCooldown > 0) return null;
  const counts = ctx.itemUsageCounts;
  if (!counts) return null;

  const maxUses = Math.max(counts.SMOKE ?? 0, counts.MIRROR ?? 0, counts.PLATE ?? 0);
  if (maxUses >= 2) {
    return PlayerAction.USE_ITEM;
  }
  return null;
}

export function analyzePlayerPattern(
  ctx: RoundContext,
  rng: () => number,
): PatternPrediction {
  const history = ctx.playerHistory;
  const hints: PatternPrediction["hints"] = {};

  if (history.length < 2) {
    const action = pickRandom(ALL_PLAYER_ACTIONS, rng);
    return { action, confidence: 0.2 + rng() * 0.15, hints };
  }

  const freq = detectFrequency(history);
  if (freq) hints.frequency = freq.action;

  const alt = detectAlternation(history);
  if (alt.isAlternating && alt.nextInCycle && history.length >= 4) {
    const followCycle = rng() < 0.58;
    const predicted = followCycle ? alt.nextInCycle : alt.breakAction!;
    hints.alternation = predicted;
    return {
      action: predicted,
      confidence: lateRoundConfidenceBoost(ctx, 0.55 + rng() * 0.25),
      hints,
    };
  }

  const markov = markovPredict(history);
  if (markov) hints.markov = markov;

  const itemB = itemUsageBias(history, ctx.itemHistory);
  if (itemB) hints.itemBias = itemB;

  const itemRepeat = itemRepeatBias(ctx);
  if (itemRepeat) hints.itemBias = itemRepeat;

  const roundShift = roundPersonalityShift(ctx, rng);
  hints.roundShift = roundShift;

  const weights = new Map<PlayerAction, number>();

  function add(action: PlayerAction, w: number): void {
    weights.set(action, (weights.get(action) ?? 0) + w);
  }

  if (alt.isAlternating && alt.nextInCycle && alt.breakAction) {
    if (rng() < 0.42) {
      add(alt.breakAction, 0.62);
      hints.alternation = alt.breakAction;
    } else {
      add(alt.nextInCycle, 0.62);
      hints.alternation = alt.nextInCycle;
    }
    if (freq) {
      add(freq.action, 0.08);
    }
  } else if (freq) {
    add(freq.action, 0.25 + freq.frequency * 0.35);
  }

  if (markov) {
    add(markov, 0.3);
  }

  if (itemB) {
    add(itemB, 0.22);
  }

  if (itemRepeat) {
    add(PlayerAction.USE_ITEM, 0.28);
  }

  add(roundShift, 0.18);

  if (weights.size === 0) {
    const action = freq?.action ?? pickRandom(ALL_PLAYER_ACTIONS, rng);
    return {
      action,
      confidence: lateRoundConfidenceBoost(ctx, 0.35 + rng() * 0.2),
      hints,
    };
  }

  let best: PlayerAction = PlayerAction.FIRE;
  let bestW = -1;
  let total = 0;
  for (const [action, w] of weights) {
    total += w;
    if (w > bestW) {
      bestW = w;
      best = action;
    }
  }

  const confidence = lateRoundConfidenceBoost(
    ctx,
    Math.min(0.92, Math.max(0.25, bestW / Math.max(total, 0.01))),
  );

  return { action: best, confidence, hints };
}

export function patternHintsForTee(
  prediction: PatternPrediction,
  roundIndex: number,
): Record<string, unknown> {
  return {
    predicted_action: prediction.action,
    confidence: prediction.confidence,
    detectors: prediction.hints,
    round_index: roundIndex,
  };
}

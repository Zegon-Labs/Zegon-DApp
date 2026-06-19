import {
  IZegonBrain,
  PlayerAction,
  RoundContext,
  ZegonAction,
  ZegonDecision,
} from "@zegon/game-core";

export interface ScriptedRound {
  decision: ZegonDecision;
}

export class ScriptedZegonBrain implements IZegonBrain {
  private index = 0;

  constructor(private readonly scripts: ScriptedRound[]) {}

  async decide(_ctx: RoundContext): Promise<ZegonDecision> {
    const script = this.scripts[this.index] ?? this.scripts[this.scripts.length - 1]!;
    this.index += 1;
    return script.decision;
  }

  reset(): void {
    this.index = 0;
  }
}

export function buildTutorialScripts(locale: "en" | "es"): ScriptedRound[] {
  const taunts = locale === "es"
    ? [
        "No veo… pero escucho tus pasos.",
        "Alto. Te tengo en la mira.",
        "Te leí. La venda brilla.",
        "Sin balas. Momento perfecto.",
      ]
    : [
        "I can't see… but I hear your steps.",
        "Hold still. I've got you.",
        "Read you. The band glows.",
        "Out of ammo. Perfect moment.",
      ];

  return [
    {
      decision: {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.RELOAD,
        confidence: 0.3,
        taunt: taunts[0]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: taunts[1]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE_LOW,
        zegonMove: ZegonAction.FEINT,
        confidence: 0.9,
        taunt: taunts[2]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.RELOAD,
        confidence: 0.4,
        taunt: locale === "es" ? "Otra vez el mismo ritmo…" : "Same rhythm again…",
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.RELOAD,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.4,
        taunt: taunts[3]!,
      },
    },
  ];
}

export const TUTORIAL_DONE_KEY = "zegon-tutorial-done";

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
}

export function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_DONE_KEY, "1");
}

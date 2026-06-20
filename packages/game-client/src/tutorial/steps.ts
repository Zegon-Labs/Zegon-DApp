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
        "Leí tu disparo. Alto contra alto.",
        "Recargás… ¿o no?",
        "Otra vez el mismo ritmo…",
        "Sin balas. Momento perfecto.",
        "Recargar frente a un ciego… valiente.",
        "¡DEADEYE! No escapás.",
      ]
    : [
        "I can't see… but I hear your steps.",
        "Hold still. I've got you.",
        "Read your shot. High against high.",
        "Reloading… or are you?",
        "Same rhythm again…",
        "Out of ammo. Perfect moment.",
        "Reloading against a blind man… bold.",
        "DEADEYE! You won't escape.",
      ];

  return [
    {
      decision: {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
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
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.95,
        taunt: taunts[2]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.RELOAD,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.35,
        taunt: taunts[3]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.RELOAD,
        confidence: 0.4,
        taunt: taunts[4]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.RELOAD,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.4,
        taunt: taunts[5]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.RELOAD,
        zegonMove: ZegonAction.FIRE_LOW,
        confidence: 0.85,
        taunt: taunts[6]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 1,
        taunt: taunts[7]!,
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

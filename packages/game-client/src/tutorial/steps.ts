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
        "Disparo. Te tengo.",
        "Leí tu disparo.",
        "Humo… no importa.",
        "¡DEADEYE! La placa aguanta.",
        "Espejo… devolvéselo.",
      ]
    : [
        "I can't see… but I hear your steps.",
        "Shooting. I've got you.",
        "Read your shot.",
        "Smoke… doesn't matter.",
        "DEADEYE! The plate holds.",
        "Mirror… send it back.",
      ];

  return [
    {
      decision: {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.3,
        taunt: taunts[0]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.5,
        taunt: taunts[1]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.95,
        taunt: taunts[2]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.7,
        taunt: taunts[3]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 1,
        taunt: taunts[4]!,
      },
    },
    {
      decision: {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.95,
        taunt: taunts[5]!,
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

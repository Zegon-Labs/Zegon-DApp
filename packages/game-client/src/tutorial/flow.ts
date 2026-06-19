import { PlayerAction } from "@zegon/game-core";

export type TutorialSegment =
  | { kind: "modal"; titleKey: string; bodyKey: string; lesson?: number }
  | {
      kind: "practice";
      instructionKey: string;
      allowedActions: PlayerAction[];
      roundIndex: number;
      forceAmmoZero?: boolean;
    }
  | { kind: "finish"; titleKey: string; bodyKey: string };

export const TUTORIAL_FLOW: TutorialSegment[] = [
  { kind: "modal", titleKey: "tutorialTitle", bodyKey: "tutorialIntro", lesson: 1 },
  { kind: "modal", titleKey: "tutorialHpTitle", bodyKey: "tutorialHpBody", lesson: 2 },
  { kind: "modal", titleKey: "tutorialBlindsightTitle", bodyKey: "tutorialBlindsightBody", lesson: 3 },
  { kind: "modal", titleKey: "tutorialDeadeyeTitle", bodyKey: "tutorialDeadeyeBody", lesson: 4 },
  { kind: "modal", titleKey: "tutorialActionsTitle", bodyKey: "tutorialActionsBody", lesson: 5 },
  { kind: "modal", titleKey: "tutorialAmmoTitle", bodyKey: "tutorialAmmoBody", lesson: 6 },
  { kind: "modal", titleKey: "tutorialPracticeTitle", bodyKey: "tutorialPracticeBody", lesson: 7 },
  {
    kind: "practice",
    instructionKey: "tutorialStepFire",
    allowedActions: [PlayerAction.FIRE_HIGH, PlayerAction.FIRE_LOW],
    roundIndex: 0,
  },
  {
    kind: "practice",
    instructionKey: "tutorialStepDodge",
    allowedActions: [PlayerAction.DODGE],
    roundIndex: 1,
  },
  {
    kind: "practice",
    instructionKey: "tutorialStepRead",
    allowedActions: [PlayerAction.FIRE_LOW],
    roundIndex: 2,
  },
  {
    kind: "practice",
    instructionKey: "tutorialStepFeint",
    allowedActions: [PlayerAction.FEINT],
    roundIndex: 3,
  },
  {
    kind: "practice",
    instructionKey: "tutorialStepReload",
    allowedActions: [PlayerAction.RELOAD],
    roundIndex: 4,
    forceAmmoZero: true,
  },
  { kind: "modal", titleKey: "tutorialVerifyTitle", bodyKey: "tutorialVerifyBody" },
  { kind: "finish", titleKey: "tutorialComplete", bodyKey: "tutorialCompleteBody" },
];

export const PRACTICE_SEGMENTS = TUTORIAL_FLOW.filter(
  (s): s is Extract<TutorialSegment, { kind: "practice" }> => s.kind === "practice",
);

export const LESSON_COUNT = TUTORIAL_FLOW.filter((s) => s.kind === "modal" && s.lesson).length;

export function getPracticeForRound(roundIndex: number) {
  return PRACTICE_SEGMENTS.find((s) => s.roundIndex === roundIndex);
}

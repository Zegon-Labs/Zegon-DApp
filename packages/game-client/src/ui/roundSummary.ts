import type { RoundOutcome } from "@zegon/game-core";
import { isFireAction, PlayerAction } from "@zegon/game-core";
import type { LocaleStrings } from "../i18n/index.js";
import { COLORS } from "./theme.js";

type ActionLabelFn = (action: string) => string;

export type RoundSummaryLineRole = "headline" | "outcome" | "delta" | "damage" | "note";

export interface RoundSummaryLine {
  text: string;
  role: RoundSummaryLineRole;
}

export interface RoundSummaryResult {
  lines: RoundSummaryLine[];
  color: string;
  durationMs: number;
}

/** Time to read after the last line finishes animating in. */
const READ_AFTER_REVEAL_MS = 4800;
const REVEAL_BASE_MS = 80;
const REVEAL_STAGGER_MS = 90;
const REVEAL_ANIM_MS = 340;

function displayDuration(lineCount: number): number {
  const revealEnd =
    REVEAL_BASE_MS + Math.max(0, lineCount - 1) * REVEAL_STAGGER_MS + REVEAL_ANIM_MS;
  return revealEnd + READ_AFTER_REVEAL_MS;
}

function isMirrorFire(playerAction: string, zegonMove: string): boolean {
  return (
    (playerAction === PlayerAction.FIRE_HIGH && zegonMove === "FIRE_HIGH") ||
    (playerAction === PlayerAction.FIRE_LOW && zegonMove === "FIRE_LOW")
  );
}

export function buildRoundSummary(
  outcome: RoundOutcome,
  strings: LocaleStrings,
  labelAction: ActionLabelFn,
): RoundSummaryResult {
  const zegonMove = labelAction(outcome.zegonDecision.zegonMove);
  const lines: RoundSummaryLine[] = [
    {
      text: `${strings.zegonPlayed}: ${zegonMove}`.toUpperCase(),
      role: "headline",
    },
  ];

  const mirror = isMirrorFire(
    outcome.playerAction,
    outcome.zegonDecision.zegonMove,
  );

  if (outcome.predictionCorrect) {
    lines.push({
      text: `${strings.roundSummaryRead} · ${strings.zegonReadYou}`,
      role: "outcome",
    });
  } else {
    lines.push({
      text: strings.roundSummarySurprised,
      role: "outcome",
    });
  }

  if (outcome.blindsightDelta === 0 && outcome.blindsightAfter === 0) {
    lines.push({
      text: strings.roundSummaryBlindsightFloor,
      role: "note",
    });
  } else {
    const bsDelta =
      outcome.blindsightDelta >= 0
        ? `+${outcome.blindsightDelta}`
        : String(outcome.blindsightDelta);
    lines.push({
      text: `${strings.hudBlindsight} ${bsDelta}`,
      role: "delta",
    });
  }

  if (outcome.playerDamage > 0) {
    lines.push({
      text: `${strings.roundSummaryYouHit} −${outcome.playerDamage} ${strings.hudHp}`,
      role: "damage",
    });
    if (
      mirror &&
      isFireAction(outcome.playerAction) &&
      outcome.predictionCorrect
    ) {
      lines.push({
        text: strings.roundSummaryMirrorReadHit,
        role: "note",
      });
    }
  }
  if (outcome.zegonDamage > 0) {
    lines.push({
      text: `${strings.roundSummaryZegonHit} −${outcome.zegonDamage} ${strings.hudHp}`,
      role: "damage",
    });
  }
  if (
    outcome.playerDamage === 0 &&
    outcome.zegonDamage === 0 &&
    mirror &&
    isFireAction(outcome.playerAction)
  ) {
    lines.push({
      text: strings.roundSummaryMirrorStandoff,
      role: "note",
    });
  } else if (outcome.playerDamage === 0 && outcome.zegonDamage === 0) {
    lines.push({
      text: strings.roundSummaryNoDamage,
      role: "note",
    });
  }

  if (outcome.deadeyeTriggered) {
    lines.push({
      text: strings.roundSummaryDeadeyeOn,
      role: "note",
    });
  }
  if (outcome.deadeyeConsumed) {
    lines.push({
      text: strings.roundSummaryDeadeyeUsed,
      role: "note",
    });
  }

  let color: string = COLORS.bone;
  if (outcome.playerDamage > 0 && outcome.predictionCorrect) {
    color = COLORS.ember;
  } else if (outcome.zegonDamage > 0 && !outcome.predictionCorrect) {
    color = COLORS.verified;
  } else if (outcome.predictionCorrect) {
    color = COLORS.ember;
  }

  return {
    lines,
    color,
    durationMs: displayDuration(lines.length),
  };
}

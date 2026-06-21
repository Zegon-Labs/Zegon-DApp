import { PlayerAction, ZegonAction, type RoundOutcome } from "@zegon/game-core";
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
}

function noDamageNote(outcome: RoundOutcome, strings: LocaleStrings): string | null {
  if (outcome.playerDamage > 0 || outcome.zegonDamage > 0) return null;

  const zegonDodged = outcome.zegonDecision.zegonMove === ZegonAction.DODGE;
  const zegonFired = outcome.zegonDecision.zegonMove === ZegonAction.FIRE;
  const playerFired = outcome.playerAction === PlayerAction.FIRE;
  const playerDodged = outcome.playerAction === PlayerAction.DODGE;

  if (playerFired && zegonDodged) {
    return strings.roundSummaryMissDodge;
  }
  if (playerDodged && zegonFired) {
    return strings.roundSummaryYouDodged;
  }
  if (playerDodged && zegonDodged) {
    return strings.roundSummaryBothDodged;
  }

  return null;
}

export function buildRoundSummary(
  outcome: RoundOutcome,
  strings: LocaleStrings,
  labelAction: ActionLabelFn,
): RoundSummaryResult {
  const predicted = labelAction(outcome.zegonDecision.predictedPlayerMove);
  const zegonMove = labelAction(outcome.zegonDecision.zegonMove);
  const playerMove = labelAction(outcome.playerAction);

  const lines: RoundSummaryLine[] = [
    {
      text: `${strings.zegonPredicted}: ${predicted}`.toUpperCase(),
      role: "headline",
    },
    {
      text: `${strings.zegonPlayed}: ${zegonMove}`.toUpperCase(),
      role: "headline",
    },
    {
      text: `${strings.youPlayed}: ${playerMove}`.toUpperCase(),
      role: "delta",
    },
  ];

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

  lines.push({
    text: `${strings.roundSummaryStreak}: ${outcome.readingStreakAfter}/2`,
    role: "delta",
  });

  if (outcome.playerDamage > 0) {
    lines.push({
      text: `${strings.roundSummaryYouHit} −${outcome.playerDamage} ${strings.hudHp}`,
      role: "damage",
    });
  }
  if (outcome.zegonDamage > 0) {
    lines.push({
      text: `${strings.roundSummaryZegonHit} −${outcome.zegonDamage} ${strings.hudHp}`,
      role: "damage",
    });
  }
  if (outcome.playerDamage === 0 && outcome.zegonDamage === 0) {
    const reason = noDamageNote(outcome, strings);
    lines.push({
      text: reason ?? strings.roundSummaryNoDamage,
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
  };
}

import { PlayerAction, ZegonAction, type RoundOutcome } from "@zegon/game-core";
import type { LocaleStrings } from "../i18n/index.js";
import { COLORS } from "./theme.js";
import { damageToLives, livesLabel } from "./damageLives.js";

export type ActionLabelRole = "predicted" | "zegon" | "player";

export type ActionLabelFn = (action: string, role: ActionLabelRole) => string;

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

export interface RoundSummaryHpInfo {
  playerMaxHp?: number;
  zegonMaxHp?: number;
}

export function buildRoundSummary(
  outcome: RoundOutcome,
  strings: LocaleStrings,
  labelAction: ActionLabelFn,
  deadeyeStreak = 2,
  hpInfo?: RoundSummaryHpInfo,
): RoundSummaryResult {
  const predicted = labelAction(outcome.zegonDecision.predictedPlayerMove, "predicted");
  const zegonMove = labelAction(outcome.zegonDecision.zegonMove, "zegon");
  const playerMove = labelAction(outcome.playerAction, "player");

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

  if (outcome.deadeyeStillActive) {
    lines.push({
      text: strings.roundSummaryDeadeyeStillActive,
      role: "note",
    });
  } else {
    lines.push({
      text: `${strings.roundSummaryStreak}: ${outcome.readingStreakAfter}/${deadeyeStreak}`,
      role: "delta",
    });
  }

  if (outcome.playerDamage > 0) {
    const lives = damageToLives(outcome.playerDamage, hpInfo?.playerMaxHp);
    const lifeWord = lives === 1 ? strings.lifeSingular : strings.lifePlural;
    const lethal = outcome.wasDeadeye && outcome.playerDamage > 20;
    lines.push({
      text: lethal
        ? strings.roundSummaryYouLostAllLives
        : `${strings.roundSummaryYouHit} ${strings.roundSummaryLifeLost.replace("{n}", livesLabel(lives)).replace("{word}", lifeWord)}`,
      role: "damage",
    });
  }
  if (outcome.zegonDamage > 0) {
    const lives = damageToLives(outcome.zegonDamage, hpInfo?.zegonMaxHp);
    const lifeWord = lives === 1 ? strings.lifeSingular : strings.lifePlural;
    lines.push({
      text: `${strings.roundSummaryZegonHit} ${strings.roundSummaryLifeLost.replace("{n}", livesLabel(lives)).replace("{word}", lifeWord)}`,
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

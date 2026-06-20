import type { RoundOutcome } from "@zegon/game-core";
import type { LocaleStrings } from "../i18n/index.js";
import { COLORS } from "./theme.js";

type ActionLabelFn = (action: string) => string;

export function buildRoundSummary(
  outcome: RoundOutcome,
  strings: LocaleStrings,
  labelAction: ActionLabelFn,
): { text: string; color: string } {
  const zegonMove = labelAction(outcome.zegonDecision.zegonMove);
  const playerMove = labelAction(outcome.playerAction);

  const lines: string[] = [
    `${strings.zegonPlayed}: ${zegonMove}`,
    `${strings.youPlayed}: ${playerMove}`,
  ];

  if (outcome.predictionCorrect) {
    lines.push(`${strings.roundSummaryRead} · ${strings.zegonReadYou}`);
  } else {
    lines.push(strings.roundSummarySurprised);
  }

  const bsDelta =
    outcome.blindsightDelta >= 0
      ? `+${outcome.blindsightDelta}`
      : String(outcome.blindsightDelta);
  lines.push(`${strings.hudBlindsight} ${bsDelta}`);

  if (outcome.playerDamage > 0) {
    lines.push(`${strings.roundSummaryYouHit} −${outcome.playerDamage} ${strings.hudHp}`);
  }
  if (outcome.zegonDamage > 0) {
    lines.push(`${strings.roundSummaryZegonHit} −${outcome.zegonDamage} ${strings.hudHp}`);
  }
  if (outcome.playerDamage === 0 && outcome.zegonDamage === 0) {
    lines.push(strings.roundSummaryNoDamage);
  }

  if (outcome.deadeyeTriggered) {
    lines.push(strings.roundSummaryDeadeyeOn);
  }
  if (outcome.deadeyeConsumed) {
    lines.push(strings.roundSummaryDeadeyeUsed);
  }

  let color: string = COLORS.bone;
  if (outcome.playerDamage > 0 && outcome.predictionCorrect) {
    color = COLORS.ember;
  } else if (outcome.zegonDamage > 0 && !outcome.predictionCorrect) {
    color = COLORS.verified;
  } else if (outcome.predictionCorrect) {
    color = COLORS.ember;
  }

  return { text: lines.join("\n"), color };
}

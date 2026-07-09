import { format, type LocaleStrings } from "../i18n/index.js";
import type {
  ScoreBreakdown,
  ScoreBreakdownLine,
} from "@zegon/game-core";

function lineText(line: ScoreBreakdownLine, strings: LocaleStrings): string {
  const absPoints = Math.abs(line.points);
  switch (line.reason) {
    case "unread_rounds":
      return format(strings.scoreLineUnread, {
        points: line.points,
        count: line.count ?? 0,
      });
    case "read_penalty":
      return format(strings.scoreLineReadPenalty, {
        points: absPoints,
        count: line.count ?? 0,
      });
    case "read_streak_penalty":
      return format(strings.scoreLineReadStreak, {
        points: absPoints,
        count: line.count ?? 0,
      });
    case "surprise_bonus":
      return format(strings.scoreLineSurprise, { points: line.points });
    case "victory":
      return format(strings.scoreLineVictory, { points: line.points });
    case "clean_victory":
      return format(strings.scoreLineCleanVictory, { points: line.points });
    case "hp_bonus":
      return format(strings.scoreLineHpBonus, { points: line.points });
    case "defeat_cap":
      return format(strings.scoreLineDefeatCap, { points: absPoints });
    case "daily_multiplier":
      return format(strings.scoreLineDailyMult, {
        points: line.points,
        mult: (line.multiplier ?? 1).toFixed(2),
      });
    default:
      return "";
  }
}

function formatPenaltySummary(
  breakdown: ScoreBreakdown,
  strings: LocaleStrings,
): string | null {
  const penaltyTotal = breakdown.lines
    .filter(
      (line) =>
        line.points < 0 &&
        line.reason !== "defeat_cap",
    )
    .reduce((sum, line) => sum + Math.abs(line.points), 0);

  if (penaltyTotal <= 0) return null;
  return format(strings.scorePenaltiesTotal, { points: penaltyTotal });
}

export function formatScoreBreakdown(
  breakdown: ScoreBreakdown,
  strings: LocaleStrings,
  totalScore: number,
): string {
  const lines = breakdown.lines.map((line) => lineText(line, strings)).filter(Boolean);
  const penaltySummary = formatPenaltySummary(breakdown, strings);
  if (penaltySummary) {
    lines.push(penaltySummary);
  }
  const tips = [
    strings.scoreRankingTip1,
    strings.scoreRankingTip2,
    strings.scoreRankingTip3,
    strings.scoreRankingTip4,
  ];
  return [
    strings.scoreBreakdownTitle,
    ...lines,
    `${strings.score}: ${totalScore}`,
    "",
    strings.scoreRankingTipsTitle,
    ...tips.map((tip) => `• ${tip}`),
  ].join("\n");
}

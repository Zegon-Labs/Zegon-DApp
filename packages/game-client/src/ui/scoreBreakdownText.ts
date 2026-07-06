import { format, type LocaleStrings } from "../i18n/index.js";
import type {
  ScoreBreakdown,
  ScoreBreakdownLine,
} from "@zegon/game-core";

function lineText(line: ScoreBreakdownLine, strings: LocaleStrings): string {
  const points = Math.abs(line.points);
  switch (line.reason) {
    case "unread_rounds":
      return format(strings.scoreLineUnread, {
        points: line.points,
        count: line.count ?? 0,
      });
    case "read_penalty":
      return format(strings.scoreLineReadPenalty, {
        points,
        count: line.count ?? 0,
      });
    case "read_streak_penalty":
      return format(strings.scoreLineReadStreak, {
        points,
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
    case "daily_multiplier":
      return format(strings.scoreLineDailyMult, {
        points: line.points,
        mult: (line.multiplier ?? 1).toFixed(2),
      });
    default:
      return "";
  }
}

export function formatScoreBreakdown(
  breakdown: ScoreBreakdown,
  strings: LocaleStrings,
  totalScore: number,
): string {
  const lines = breakdown.lines.map((line) => lineText(line, strings)).filter(Boolean);
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

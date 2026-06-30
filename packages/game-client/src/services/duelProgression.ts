import {
  ACHIEVEMENTS,
  checkAchievements,
  xpForResult,
  type DuelResult,
} from "@zegon/game-core";
import { getCachedProfile, recordLocalProgress } from "./profile.js";

export async function persistDuelProgression(
  address: string,
  result: DuelResult,
  options: { surpriseStreak: number; verifiedOnChain?: boolean },
): Promise<{ earned: string[] }> {
  const cached = getCachedProfile(address);
  const earned = checkAchievements(
    {
      result,
      surpriseStreak: options.surpriseStreak,
      verifiedOnChain: options.verifiedOnChain,
    },
    cached?.achievements ?? [],
  );

  const xpGain = xpForResult(result);
  const won = result.winner === "PLAYER";
  const unlocks = earned
    .map((id) => ACHIEVEMENTS[id]?.unlockCosmetic)
    .filter((c): c is string => Boolean(c));

  // Local cache is the reliable source of truth for stats/achievements.
  recordLocalProgress(address, {
    won,
    timesRead: result.timesRead,
    xpGain,
    achievements: earned,
    unlocks,
  });

  try {
    await fetch("/api/player/profile/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        xpGain,
        won,
        timesRead: result.timesRead,
        achievements: earned.length > 0 ? earned : undefined,
      }),
    });
  } catch {
    // Non-fatal for offline play
  }

  return { earned };
}

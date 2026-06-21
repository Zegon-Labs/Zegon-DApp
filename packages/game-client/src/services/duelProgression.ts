import {
  checkAchievements,
  xpForResult,
  type DuelResult,
} from "@zegon/game-core";
import { getCachedProfile } from "./profile.js";

export async function persistDuelProgression(
  address: string,
  result: DuelResult,
  options: { surpriseStreak: number; verifiedOnChain?: boolean },
): Promise<void> {
  const cached = getCachedProfile(address);
  const earned = checkAchievements(
    {
      result,
      surpriseStreak: options.surpriseStreak,
      verifiedOnChain: options.verifiedOnChain,
    },
    cached?.achievements ?? [],
  );

  try {
    await fetch("/api/player/profile/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        xpGain: xpForResult(result),
        won: result.winner === "PLAYER",
        timesRead: result.timesRead,
        achievements: earned.length > 0 ? earned : undefined,
      }),
    });
  } catch {
    // Non-fatal for offline play
  }
}

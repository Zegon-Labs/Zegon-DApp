import {
  ACHIEVEMENTS,
  checkAchievements,
  notchesForDuel,
  xpForResult,
  type DuelResult,
} from "@zegon/game-core";
import { getCachedProfile, recordLocalProgress } from "./profile.js";
import { withSiweAuth } from "./siwe.js";

export async function persistDuelProgression(
  address: string,
  result: DuelResult,
  options: {
    surpriseStreak: number;
    verifiedOnChain?: boolean;
    playTimeMs?: number;
    dailyRank?: number;
    verifiedOnly?: boolean;
  },
): Promise<{ earned: string[]; notchesGain: number; xpGain: number }> {
  const cached = getCachedProfile(address);
  if (options.verifiedOnly) {
    const earned = checkAchievements(
      {
        result,
        surpriseStreak: options.surpriseStreak,
        verifiedOnChain: true,
        dailyRank: options.dailyRank,
      },
      cached?.achievements ?? [],
    );
    const notchesGain = 10;
    recordLocalProgress(address, {
      notchesGain,
      verifiedOnChain: true,
      achievements: earned,
    });
    try {
      const payload = await withSiweAuth({
        address,
        notchesGain,
        verifiedOnChain: true,
        achievements: earned.length > 0 ? earned : undefined,
      });
      await fetch("/api/player/profile/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      /* best-effort */
    }
    return { earned, notchesGain, xpGain: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const firstDuelOfDay = cached?.stats?.lastDuelDay !== today;

  const earned = checkAchievements(
    {
      result,
      surpriseStreak: options.surpriseStreak,
      verifiedOnChain: options.verifiedOnChain,
      dailyRank: options.dailyRank,
    },
    cached?.achievements ?? [],
  );

  const xpGain = xpForResult(result);
  const notchesGain = notchesForDuel({
    result,
    surpriseStreak: options.surpriseStreak,
    verifiedOnChain: options.verifiedOnChain,
    firstDuelOfDay,
  });
  const won = result.winner === "PLAYER";

  const unlocks = earned
    .map((id) => ACHIEVEMENTS[id]?.unlockCosmetic)
    .filter((c): c is string => Boolean(c));

  recordLocalProgress(address, {
    won,
    timesRead: result.timesRead,
    roundsPlayed: result.roundsPlayed,
    maxReadingStreak: result.finalReadingStreak,
    xpGain,
    notchesGain,
    achievements: earned,
    unlocks,
    lastDuelDay: today,
    verifiedOnChain: options.verifiedOnChain,
    playTimeMs: options.playTimeMs,
  });

  try {
    const payload = await withSiweAuth({
      address,
      xpGain,
      notchesGain,
      won,
      timesRead: result.timesRead,
      roundsPlayed: result.roundsPlayed,
      maxReadingStreak: result.finalReadingStreak,
      playTimeMs: options.playTimeMs,
      verifiedOnChain: options.verifiedOnChain,
      achievements: earned.length > 0 ? earned : undefined,
      unlocks: unlocks.length > 0 ? unlocks : undefined,
      duelDay: today,
    });
    await fetch("/api/player/profile/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* best-effort */
  }

  return { earned, notchesGain, xpGain };
}

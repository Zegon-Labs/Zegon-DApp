import {
  ACHIEVEMENTS,
  checkAchievements,
  notchesForDuel,
  xpForResult,
  type DuelResult,
} from "@zegon/game-core";
import { fetchProfile, getCachedProfile, recordLocalProgress, saveProfile } from "./profile.js";
import { withSiweAuth } from "./siwe.js";

async function ensureServerProfile(address: string): Promise<boolean> {
  const cached = getCachedProfile(address);
  if (!cached?.nickname) return false;

  const remote = await fetchProfile(address);
  if (remote?.nickname) return true;

  try {
    await saveProfile(address, cached.nickname);
    return true;
  } catch {
    return false;
  }
}

async function postProfileStats(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch("/api/player/profile/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as {
      accepted?: boolean;
      reason?: string;
    };
    if (res.ok && body.accepted !== false) return { ok: true };
    return { ok: false, reason: body.reason ?? `HTTP_${res.status}` };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

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
): Promise<{ earned: string[]; notchesGain: number; xpGain: number; statsSaved: boolean }> {
  const cached = getCachedProfile(address);
  if (!cached?.nickname) {
    return { earned: [], notchesGain: 0, xpGain: 0, statsSaved: false };
  }

  const hasServerProfile = await ensureServerProfile(address);

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
    if (!hasServerProfile) {
      return { earned, notchesGain, xpGain: 0, statsSaved: false };
    }
    const payload = await withSiweAuth({
      address,
      nickname: cached.nickname,
      notchesGain,
      verifiedOnChain: true,
      achievements: earned.length > 0 ? earned : undefined,
    });
    const posted = await postProfileStats(payload);
    return { earned, notchesGain, xpGain: 0, statsSaved: posted.ok };
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

  if (!hasServerProfile) {
    return { earned, notchesGain, xpGain, statsSaved: false };
  }

  const payload = await withSiweAuth({
    address,
    nickname: cached.nickname,
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
  const posted = await postProfileStats(payload);
  return { earned, notchesGain, xpGain, statsSaved: posted.ok };
}

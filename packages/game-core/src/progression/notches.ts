import { DuelResult, DuelWinner } from "../types/index.js";

export interface NotchEarnContext {
  result: DuelResult;
  surpriseStreak: number;
  verifiedOnChain?: boolean;
  firstDuelOfDay?: boolean;
}

export function notchesForDuel(ctx: NotchEarnContext): number {
  let notches = ctx.result.roundsPlayed * 2;
  if (ctx.result.winner === DuelWinner.PLAYER) {
    notches += 15;
  }
  if (ctx.surpriseStreak >= 2) {
    notches += 3 * (ctx.surpriseStreak - 1);
  }
  if (ctx.firstDuelOfDay) {
    notches += 5;
  }
  if (ctx.verifiedOnChain) {
    notches += 10;
  }
  return notches;
}

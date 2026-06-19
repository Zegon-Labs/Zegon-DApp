import { createHash, randomBytes } from "node:crypto";
import { RoundContext, ZegonAction } from "@zegon/game-core";

export function computeInputHash(context: RoundContext): string {
  const payload = JSON.stringify({
    history: context.playerHistory,
    hp_player: context.playerHp,
    hp_zegon: context.zegonHp,
    weapon: context.weapon,
    ammo: context.ammo,
    round: context.roundIndex,
    blindsight: context.blindsight,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function computeCommitHash(zegonMove: ZegonAction): {
  commitHash: string;
  salt: string;
} {
  const salt = randomBytes(32).toString("hex");
  const commitHash = createHash("sha256")
    .update(`${zegonMove}:${salt}`)
    .digest("hex");
  return { commitHash, salt };
}

export function verifyCommit(
  zegonMove: ZegonAction,
  salt: string,
  commitHash: string,
): boolean {
  const computed = createHash("sha256")
    .update(`${zegonMove}:${salt}`)
    .digest("hex");
  return computed === commitHash;
}

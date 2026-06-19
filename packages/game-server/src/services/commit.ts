import { createHash, randomBytes } from "node:crypto";
import { ethers } from "ethers";
import { RoundContext, ZegonAction } from "@zegon/game-core";
import { zegonActionToUint8 } from "./moveMapping.js";

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
  const saltBytes = randomBytes(32);
  const salt = saltBytes.toString("hex");
  const move = zegonActionToUint8(zegonMove);
  const commitHash = ethers.solidityPackedKeccak256(
    ["uint8", "bytes32"],
    [move, `0x${salt}`],
  );
  return { commitHash, salt };
}

export function verifyCommit(
  zegonMove: ZegonAction,
  salt: string,
  commitHash: string,
): boolean {
  const move = zegonActionToUint8(zegonMove);
  const expected = ethers.solidityPackedKeccak256(
    ["uint8", "bytes32"],
    [move, `0x${salt}`],
  );
  return expected.toLowerCase() === commitHash.toLowerCase();
}

export function duelIdToBigInt(duelId: string): bigint {
  return BigInt(`0x${duelId.slice(0, 16)}`);
}

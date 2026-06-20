import { ethers } from "ethers";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ZegonAction } from "@zegon/game-core";
import { computeCommitHash, verifyCommit } from "../services/commit.js";
import { zegonActionToUint8 } from "../services/moveMapping.js";

describe("commit hash alignment with Solidity", () => {
  it("produces valid bytes32 commit hashes", () => {
    const { commitHash } = computeCommitHash(ZegonAction.DODGE_LOW);
    expect(commitHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("verifyCommit accepts valid salt and move", () => {
    const move = ZegonAction.RELOAD;
    const { commitHash, salt } = computeCommitHash(move);
    expect(verifyCommit(move, salt, commitHash)).toBe(true);
  });

  it("verifyCommit rejects wrong salt", () => {
    const move = ZegonAction.DODGE_HIGH;
    const { commitHash } = computeCommitHash(move);
    expect(
      verifyCommit(move, randomBytes(32).toString("hex"), commitHash),
    ).toBe(false);
  });

  it("matches keccak256(abi.encodePacked(uint8, bytes32))", () => {
    const salt = randomBytes(32).toString("hex");
    const move = ZegonAction.FIRE_HIGH;
    const moveNum = zegonActionToUint8(move);
    const expected = ethers.solidityPackedKeccak256(
      ["uint8", "bytes32"],
      [moveNum, `0x${salt}`],
    );

    const manual = ethers.solidityPackedKeccak256(
      ["uint8", "bytes32"],
      [moveNum, `0x${salt}`],
    );
    expect(manual).toBe(expected);
  });
});

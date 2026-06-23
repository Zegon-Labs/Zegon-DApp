import { describe, it, expect } from "vitest";
import { withUniqueDuelSeed } from "../modes/duelSeed.js";
import { DEFAULT_DUEL_CONFIG } from "../constants/index.js";
import { DummyZegonBrain, PlayerAction } from "../index.js";

describe("withUniqueDuelSeed", () => {
  it("appends duel id to base seed", () => {
    const out = withUniqueDuelSeed(
      { ...DEFAULT_DUEL_CONFIG, seed: "standard-reader" },
      "abc123def456",
    );
    expect(out.seed).toBe("standard-reader-abc123def456");
  });

  it("varies round-0 dummy predictions across duel ids", async () => {
    const ctx = {
      roundIndex: 0,
      playerHistory: [] as readonly PlayerAction[],
      playerHp: 100,
      zegonHp: 100,
      weapon: "REVOLVER" as never,
      ammo: 6,
      blindsight: 0,
      readingStreak: 0,
      equippedItem: "SMOKE" as never,
      itemCooldown: 0,
      isDeadeye: false,
    };

    const a = await new DummyZegonBrain(
      withUniqueDuelSeed({ ...DEFAULT_DUEL_CONFIG, seed: "standard-reader" }, "duel-aaa").seed,
    ).decide(ctx);
    const b = await new DummyZegonBrain(
      withUniqueDuelSeed({ ...DEFAULT_DUEL_CONFIG, seed: "standard-reader" }, "duel-bbb").seed,
    ).decide(ctx);

    const same =
      a.predictedPlayerMove === b.predictedPlayerMove &&
      a.zegonMove === b.zegonMove;
    expect(same).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { DummyZegonBrain, DuelItemId, PlayerAction } from "../index.js";

const baseCtx = {
  roundIndex: 0,
  playerHistory: [] as readonly PlayerAction[],
  playerHp: 100,
  zegonHp: 100,
  weapon: "REVOLVER" as never,
  ammo: 6,
  blindsight: 0,
  readingStreak: 0,
  equippedItem: DuelItemId.SMOKE,
  itemCooldown: 0,
  isDeadeye: false,
};

describe("DummyZegonBrain", () => {
  it("returns valid decision shape", async () => {
    const brain = new DummyZegonBrain("brain-test");
    const decision = await brain.decide(baseCtx);

    expect(decision.predictedPlayerMove).toBeDefined();
    expect(decision.zegonMove).toBeDefined();
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(decision.taunt.length).toBeGreaterThan(0);
  });

  it("detects repeated patterns", async () => {
    const brain = new DummyZegonBrain("pattern-test");
    const history = [
      PlayerAction.FIRE,
      PlayerAction.FIRE,
      PlayerAction.FIRE,
    ];

    const decision = await brain.decide({
      ...baseCtx,
      roundIndex: 3,
      playerHistory: history,
      readingStreak: 1,
      blindsight: 40,
    });

    expect(decision.predictedPlayerMove).toBe(PlayerAction.FIRE);
    expect(decision.confidence).toBeGreaterThan(0.4);
  });

  it("is deterministic with same seed", async () => {
    const a = await new DummyZegonBrain("fixed").decide(baseCtx);
    const b = await new DummyZegonBrain("fixed").decide(baseCtx);
    expect(a).toEqual(b);
  });
});

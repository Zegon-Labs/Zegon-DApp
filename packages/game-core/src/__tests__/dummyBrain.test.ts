import { describe, it, expect } from "vitest";
import { DummyZegonBrain, PlayerAction } from "../index.js";

describe("DummyZegonBrain", () => {
  it("returns valid decision shape", async () => {
    const brain = new DummyZegonBrain("brain-test");
    const decision = await brain.decide({
      roundIndex: 0,
      playerHistory: [],
      playerHp: 100,
      zegonHp: 100,
      weapon: "REVOLVER" as never,
      ammo: 6,
      blindsight: 0,
      isDeadeye: false,
    });

    expect(decision.predictedPlayerMove).toBeDefined();
    expect(decision.zegonMove).toBeDefined();
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(decision.taunt.length).toBeGreaterThan(0);
  });

  it("detects repeated patterns", async () => {
    const brain = new DummyZegonBrain("pattern-test");
    const history = [
      PlayerAction.FIRE_HIGH,
      PlayerAction.FIRE_HIGH,
      PlayerAction.FIRE_HIGH,
    ];

    const decision = await brain.decide({
      roundIndex: 3,
      playerHistory: history,
      playerHp: 100,
      zegonHp: 100,
      weapon: "REVOLVER" as never,
      ammo: 6,
      blindsight: 30,
      isDeadeye: false,
    });

    expect(decision.predictedPlayerMove).toBe(PlayerAction.FIRE_HIGH);
    expect(decision.confidence).toBeGreaterThan(0.4);
  });

  it("is deterministic with same seed", async () => {
    const ctx = {
      roundIndex: 0,
      playerHistory: [] as const,
      playerHp: 100,
      zegonHp: 100,
      weapon: "REVOLVER" as never,
      ammo: 6,
      blindsight: 0,
      isDeadeye: false,
    };

    const a = await new DummyZegonBrain("fixed").decide(ctx);
    const b = await new DummyZegonBrain("fixed").decide(ctx);
    expect(a).toEqual(b);
  });
});

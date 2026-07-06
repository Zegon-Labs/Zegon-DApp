import { describe, it, expect } from "vitest";
import {
  DummyZegonBrain,
  DuelItemId,
  PlayerAction,
  ZegonAction,
  pickZegonMove,
  createRoundRng,
} from "../index.js";

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
  itemCooldownRounds: 4,
  isDeadeye: false,
};

describe("zegonTactics", () => {
  it("varies zegon move across rounds with the same duel seed", async () => {
    const brain = new DummyZegonBrain("variety-seed");
    const moves = new Set<ZegonAction>();

    for (let round = 0; round < 12; round++) {
      const history = round % 2 === 0
        ? ([PlayerAction.FIRE, PlayerAction.FIRE] as const)
        : ([PlayerAction.DODGE, PlayerAction.DODGE] as const);
      const decision = await brain.decide({
        ...baseCtx,
        roundIndex: round,
        playerHistory: history,
      });
      moves.add(decision.zegonMove);
    }

    expect(moves.size).toBeGreaterThan(1);
  });

  it("can pick DODGE when countering a predicted FIRE", () => {
    const ctx = { ...baseCtx, roundIndex: 3, playerHistory: [PlayerAction.FIRE, PlayerAction.FIRE] };
    let sawDodge = false;

    for (let i = 0; i < 24; i++) {
      const roundCtx = { ...ctx, roundIndex: 3 + i };
      const move = pickZegonMove(PlayerAction.FIRE, roundCtx, createRoundRng(`dodge-test-${i}`, roundCtx));
      if (move === ZegonAction.DODGE) sawDodge = true;
    }

    expect(sawDodge).toBe(true);
  });

  it("fires during DEADEYE", () => {
    const ctx = { ...baseCtx, roundIndex: 5, isDeadeye: true };
    const move = pickZegonMove(PlayerAction.FIRE, ctx, createRoundRng("deadeye-fire", ctx));
    expect(move).toBe(ZegonAction.FIRE);
  });
});

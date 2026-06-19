import { describe, it, expect } from "vitest";
import {
  DuelController,
  DummyZegonBrain,
  DuelPhase,
  PlayerAction,
  canTransition,
  DuelPhase as Phase,
} from "../index.js";

describe("DuelStateMachine", () => {
  it("allows valid transitions", () => {
    expect(canTransition(Phase.IDLE, Phase.ZEGON_THINKING)).toBe(true);
    expect(canTransition(Phase.AWAITING_PLAYER, Phase.RESOLVING)).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransition(Phase.IDLE, Phase.DUEL_END)).toBe(false);
  });
});

describe("DuelController", () => {
  it("runs a full round cycle", async () => {
    const controller = new DuelController(new DummyZegonBrain("test-seed"));
    await controller.startDuel();

    expect(controller.getState().phase).toBe(DuelPhase.AWAITING_PLAYER);

    const outcome = controller.submitPlayerAction(PlayerAction.FIRE_HIGH);
    expect(outcome.playerAction).toBe(PlayerAction.FIRE_HIGH);
    expect(controller.getState().playerHistory).toHaveLength(1);
  });

  it("ends duel when hp reaches zero", async () => {
    const controller = new DuelController(
      new DummyZegonBrain("kill-seed"),
      { initialPlayerHp: 1, initialZegonHp: 1, maxRounds: 50 },
    );

    await controller.startDuel();

    let safety = 0;
    while (!controller.isDuelOver() && safety < 100) {
      const actions = controller.getAvailableActions();
      if (actions.length === 0) {
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }
      controller.submitPlayerAction(actions[0]!);
      safety++;
    }

    expect(controller.getState().phase).toBe(DuelPhase.DUEL_END);
    expect(controller.getResult().roundsPlayed).toBeGreaterThan(0);
  });
});

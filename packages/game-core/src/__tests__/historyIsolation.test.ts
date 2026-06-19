import { describe, it, expect } from "vitest";
import {
  DuelController,
  DummyZegonBrain,
  PlayerAction,
} from "../index.js";

describe("history isolation", () => {
  it("history does not include current action before resolution", async () => {
    const controller = new DuelController(new DummyZegonBrain("iso-seed"));
    await controller.startDuel();

    const historyBefore = controller.getState().playerHistory;
    expect(historyBefore).toHaveLength(0);

    controller.submitPlayerAction(PlayerAction.DODGE);
    const historyAfter = controller.getState().playerHistory;
    expect(historyAfter).toHaveLength(1);
    expect(historyAfter[0]).toBe(PlayerAction.DODGE);
  });

  it("accumulates history across rounds", async () => {
    const brain = new DummyZegonBrain("acc-seed");
    const controller = new DuelController(brain, { maxRounds: 3 });

    await controller.startDuel();

    for (let i = 0; i < 3; i++) {
      if (controller.isDuelOver()) break;
      const actions = controller.getAvailableActions();
      if (actions.length === 0) {
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      controller.submitPlayerAction(actions[0]!);
    }

    expect(controller.getState().playerHistory.length).toBeLessThanOrEqual(3);
  });
});

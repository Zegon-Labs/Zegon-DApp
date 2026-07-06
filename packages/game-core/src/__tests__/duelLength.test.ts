import { describe, it, expect } from "vitest";
import {
  DuelController,
  DuelPhase,
  DuelWinner,
  DUEL,
  DUEL_LENGTH_PRESETS,
  PlayerAction,
  ZegonAction,
  type IZegonBrain,
  type RoundContext,
  type ZegonDecision,
} from "../index.js";

/** Always dodges and mispredicts — every round is damage-free. */
class PacifistBrain implements IZegonBrain {
  decide(_ctx: RoundContext): Promise<ZegonDecision> {
    return Promise.resolve({
      predictedPlayerMove: PlayerAction.DODGE,
      zegonMove: ZegonAction.DODGE,
      confidence: 0,
      taunt: "",
    });
  }
}

async function playUntilOver(controller: DuelController): Promise<void> {
  await controller.startDuel();
  let safety = 0;
  while (!controller.isDuelOver() && safety < 200) {
    const actions = controller.getAvailableActions();
    if (actions.length === 0) {
      await new Promise((r) => setTimeout(r, 5));
      continue;
    }
    controller.submitPlayerAction(PlayerAction.DODGE);
    safety++;
  }
}

describe("duel length presets", () => {
  it("exposes quick/standard/long presets with standard = default tie-break", () => {
    expect(DUEL_LENGTH_PRESETS.quick).toBeLessThan(DUEL_LENGTH_PRESETS.standard);
    expect(DUEL_LENGTH_PRESETS.standard).toBe(DUEL.MAX_ROUNDS_TIEBREAK);
    expect(DUEL_LENGTH_PRESETS.long).toBeGreaterThan(DUEL_LENGTH_PRESETS.standard);
  });

  it("ends at config.tiebreakRounds when both fighters survive", async () => {
    const controller = new DuelController(new PacifistBrain(), {
      tiebreakRounds: 4,
      maxRounds: 50,
    });

    await playUntilOver(controller);

    expect(controller.getState().phase).toBe(DuelPhase.DUEL_END);
    const result = controller.getResult();
    expect(result.roundsPlayed).toBe(4);
    expect(result.playerHp).toBeGreaterThan(0);
    expect(result.zegonHp).toBeGreaterThan(0);
    // No rounds were won by either side → draw on the tie-break.
    expect(result.winner).toBe(DuelWinner.DRAW);
  });

  it("defaults to DUEL.MAX_ROUNDS_TIEBREAK when tiebreakRounds is unset", async () => {
    const controller = new DuelController(new PacifistBrain(), {
      maxRounds: 100,
    });

    await playUntilOver(controller);

    expect(controller.getResult().roundsPlayed).toBe(DUEL.MAX_ROUNDS_TIEBREAK);
  });
});

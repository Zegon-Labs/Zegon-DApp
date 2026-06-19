import { describe, it, expect } from "vitest";
import {
  applyBlindsight,
  computeBlindsightDelta,
  shouldTriggerDeadeye,
  WeaponId,
  PlayerAction,
} from "../index.js";
import { BLINDSIGHT } from "../constants/index.js";

describe("BlindsightEngine", () => {
  it("increases on correct prediction", () => {
    const delta = computeBlindsightDelta(
      true,
      PlayerAction.FIRE_HIGH,
      WeaponId.REVOLVER,
    );
    expect(delta).toBe(BLINDSIGHT.ON_CORRECT_PREDICT);
  });

  it("decreases on wrong prediction", () => {
    const delta = computeBlindsightDelta(
      false,
      PlayerAction.FIRE_HIGH,
      WeaponId.REVOLVER,
    );
    expect(delta).toBe(BLINDSIGHT.ON_WRONG_PREDICT);
  });

  it("FEINT always lowers blindsight", () => {
    const delta = computeBlindsightDelta(
      true,
      PlayerAction.FEINT,
      WeaponId.REVOLVER,
    );
    expect(delta).toBe(BLINDSIGHT.ON_FEINT);
  });

  it("shotgun amplifies positive delta via noise", () => {
    const revolver = computeBlindsightDelta(
      true,
      PlayerAction.FIRE_HIGH,
      WeaponId.REVOLVER,
    );
    const shotgun = computeBlindsightDelta(
      true,
      PlayerAction.FIRE_HIGH,
      WeaponId.SHOTGUN,
    );
    expect(shotgun).toBeGreaterThan(revolver);
  });

  it("glitch pistol dampens positive delta", () => {
    const revolver = computeBlindsightDelta(
      true,
      PlayerAction.FIRE_HIGH,
      WeaponId.REVOLVER,
    );
    const glitch = computeBlindsightDelta(
      true,
      PlayerAction.FIRE_HIGH,
      WeaponId.GLITCH_PISTOL,
    );
    expect(glitch).toBeLessThan(revolver);
  });

  it("triggers deadeye at threshold", () => {
    const result = applyBlindsight(90, 15);
    expect(result.isDeadeye).toBe(true);
    expect(shouldTriggerDeadeye(result.value)).toBe(true);
  });

  it("clamps to min/max", () => {
    const low = applyBlindsight(5, -20);
    expect(low.value).toBe(BLINDSIGHT.MIN);
    const high = applyBlindsight(95, 20);
    expect(high.value).toBe(BLINDSIGHT.MAX);
  });
});

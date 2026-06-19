import { describe, it, expect } from "vitest";
import {
  PlayerAction,
  ZegonAction,
  WeaponId,
  resolveRound,
} from "../index.js";

const baseCtx = {
  roundIndex: 0,
  playerHistory: [],
  playerHp: 100,
  zegonHp: 100,
  weapon: WeaponId.REVOLVER,
  ammo: 6,
  blindsight: 0,
  isDeadeye: false,
};

describe("resolveRound", () => {
  it("player FIRE hits when prediction wrong", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(25);
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
  });

  it("player FIRE fails when predicted correctly", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.8,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
  });

  it("DODGE avoids zegon fire", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.DODGE,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
  });

  it("FEINT lowers blindsight", () => {
    const outcome = resolveRound(
      { ...baseCtx, blindsight: 50 },
      PlayerAction.FEINT,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.blindsightDelta).toBeLessThan(0);
    expect(outcome.playerDamage).toBe(0);
  });

  it("RELOAD is vulnerable to zegon fire", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.RELOAD,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.3,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBeGreaterThan(0);
    expect(outcome.ammoAfter).toBe(6);
  });

  it("DEADEYE guarantees zegon hit", () => {
    const outcome = resolveRound(
      { ...baseCtx, isDeadeye: true },
      PlayerAction.DODGE,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBeGreaterThan(0);
    expect(outcome.deadeyeConsumed).toBe(true);
  });

  it("consumes ammo on fire", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_LOW,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.2,
        taunt: "test",
      },
    );
    expect(outcome.ammoAfter).toBe(5);
  });
});

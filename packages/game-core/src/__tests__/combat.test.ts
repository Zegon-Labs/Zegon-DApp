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
  it("mirror fire standoff when ZEGON fails to read", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
  });

  it("mirror fire hits player when ZEGON reads correctly", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(20);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
  });

  it("player FIRE hits when prediction wrong and shots differ", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
        zegonMove: ZegonAction.FIRE_LOW,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(20);
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
  });

  it("DODGE LOW avoids ZEGON fire high", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.DODGE_LOW,
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

  it("DODGE HIGH avoids ZEGON fire low", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.DODGE_HIGH,
      {
        predictedPlayerMove: PlayerAction.FIRE_LOW,
        zegonMove: ZegonAction.FIRE_LOW,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
  });

  it("wrong dodge direction gets hit", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.DODGE_HIGH,
      {
        predictedPlayerMove: PlayerAction.DODGE_HIGH,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(20);
    expect(outcome.zegonDamage).toBe(0);
  });

  it("FIRE LOW hits ZEGON dodging low (wrong direction)", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_LOW,
      {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
        zegonMove: ZegonAction.DODGE_LOW,
        confidence: 0.2,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(20);
    expect(outcome.playerDamage).toBe(0);
  });

  it("FIRE LOW misses ZEGON dodging high (correct direction)", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_LOW,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.DODGE_HIGH,
        confidence: 0.2,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.playerDamage).toBe(0);
  });

  it("player FIRE fails when predicted correctly", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.DODGE_LOW,
        confidence: 0.8,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
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
        predictedPlayerMove: PlayerAction.DODGE_LOW,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.3,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBeGreaterThan(0);
    expect(outcome.ammoAfter).toBe(6);
  });

  it("DEADEYE pierces correct dodge when ZEGON read you", () => {
    const outcome = resolveRound(
      { ...baseCtx, isDeadeye: true },
      PlayerAction.DODGE_LOW,
      {
        predictedPlayerMove: PlayerAction.DODGE_LOW,
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
        predictedPlayerMove: PlayerAction.DODGE_HIGH,
        zegonMove: ZegonAction.DODGE_HIGH,
        confidence: 0.2,
        taunt: "test",
      },
    );
    expect(outcome.ammoAfter).toBe(5);
  });
});

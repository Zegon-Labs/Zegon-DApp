import { describe, it, expect } from "vitest";
import {
  DuelItemId,
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
  readingStreak: 0,
  equippedItem: DuelItemId.SMOKE,
  itemCooldown: 0,
  itemCooldownRounds: 4,
  isDeadeye: false,
};

describe("resolveRound", () => {
  it("player FIRE hits when prediction wrong and ZEGON fires", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(20);
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
  });

  it("player FIRE fails when ZEGON reads correctly", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(20);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
    expect(outcome.readingStreakAfter).toBe(1);
  });

  it("DODGE avoids ZEGON fire", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.DODGE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
  });

  it("player FIRE misses when ZEGON dodges", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.8,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
  });

  it("SMOKE breaks read and avoids damage", () => {
    const outcome = resolveRound(
      { ...baseCtx, equippedItem: DuelItemId.SMOKE },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.predictionCorrect).toBe(false);
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.readingStreakAfter).toBe(0);
    expect(outcome.itemCooldownAfter).toBe(4);
  });

  it("MIRROR reflects when read correctly", () => {
    const outcome = resolveRound(
      { ...baseCtx, equippedItem: DuelItemId.MIRROR },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.zegonDamage).toBe(20);
    expect(outcome.playerDamage).toBe(0);
  });

  it("PLATE blocks ZEGON fire", () => {
    const outcome = resolveRound(
      { ...baseCtx, equippedItem: DuelItemId.PLATE },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
  });

  it("PLATE blocks DEADEYE and consumes it without raising streak", () => {
    const outcome = resolveRound(
      {
        ...baseCtx,
        equippedItem: DuelItemId.PLATE,
        readingStreak: 2,
        isDeadeye: true,
      },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.deadeyeConsumed).toBe(true);
    expect(outcome.readingStreakAfter).toBe(0);
    expect(outcome.predictionCorrect).toBe(true);
  });

  it("SMOKE consumes active DEADEYE without damage", () => {
    const outcome = resolveRound(
      {
        ...baseCtx,
        equippedItem: DuelItemId.SMOKE,
        readingStreak: 2,
        isDeadeye: true,
      },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.predictionCorrect).toBe(false);
    expect(outcome.deadeyeConsumed).toBe(true);
    expect(outcome.readingStreakAfter).toBe(0);
  });

  it("MIRROR reflects DEADEYE lethally when read correctly", () => {
    const outcome = resolveRound(
      {
        ...baseCtx,
        equippedItem: DuelItemId.MIRROR,
        isDeadeye: true,
      },
      PlayerAction.USE_ITEM,
      {
        predictedPlayerMove: PlayerAction.USE_ITEM,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(0);
    expect(outcome.zegonDamage).toBe(100);
    expect(outcome.deadeyeConsumed).toBe(true);
  });

  it("DEADEYE pierces dodge when read correctly", () => {
    const outcome = resolveRound(
      { ...baseCtx, isDeadeye: true },
      PlayerAction.DODGE,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(100);
    expect(outcome.deadeyeConsumed).toBe(true);
  });

  it("DEADEYE is lethal at any remaining HP", () => {
    const outcome = resolveRound(
      { ...baseCtx, playerHp: 40, isDeadeye: true },
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(40);
    expect(outcome.deadeyeConsumed).toBe(true);
  });

  it("DEADEYE stays active when surprised without an item", () => {
    const outcome = resolveRound(
      { ...baseCtx, readingStreak: 2, isDeadeye: true },
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.5,
        taunt: "test",
      },
    );
    expect(outcome.predictionCorrect).toBe(false);
    expect(outcome.readingStreakAfter).toBe(0);
    expect(outcome.deadeyeConsumed).toBe(false);
    expect(outcome.deadeyeStillActive).toBe(true);
    expect(outcome.blindsightAfter).toBe(100);
  });

  it("non-DEADEYE read hit only removes one life", () => {
    const outcome = resolveRound(
      baseCtx,
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.playerDamage).toBe(20);
    expect(outcome.wasDeadeye).toBe(false);
  });

  it("triggers deadeye after two consecutive reads", () => {
    const outcome = resolveRound(
      { ...baseCtx, readingStreak: 1 },
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );
    expect(outcome.readingStreakAfter).toBe(2);
    expect(outcome.deadeyeTriggered).toBe(true);
  });
});

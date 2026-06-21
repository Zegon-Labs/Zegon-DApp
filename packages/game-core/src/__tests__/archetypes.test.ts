import { describe, it, expect } from "vitest";
import {
  createStandardDuelWithArchetype,
  DuelController,
  DummyZegonBrain,
  DuelItemId,
  getGamblerWeapon,
  PlayerAction,
  resolveRound,
  WeaponId,
  ZegonAction,
} from "../index.js";

describe("archetypes", () => {
  it("reader starts with 90 player HP", () => {
    const config = createStandardDuelWithArchetype("reader");
    expect(config.initialPlayerHp).toBe(90);

    const controller = new DuelController(new DummyZegonBrain(config.seed), config);
    expect(controller.getState().playerHp).toBe(90);
  });

  it("deadeye archetype triggers DEADEYE after one read", () => {
    const config = createStandardDuelWithArchetype("deadeye");
    expect(config.initialPlayerHp).toBe(110);

    const outcome = resolveRound(
      {
        roundIndex: 0,
        playerHistory: [],
        playerHp: 110,
        zegonHp: 100,
        weapon: WeaponId.REVOLVER,
        ammo: 6,
        blindsight: 0,
        readingStreak: 0,
        equippedItem: DuelItemId.SMOKE,
        itemCooldown: 0,
        isDeadeye: false,
        modifiers: config.modifiers,
        archetype: "deadeye",
      },
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.8,
        taunt: "test",
      },
    );

    expect(outcome.deadeyeTriggered).toBe(true);
    expect(outcome.readingStreakAfter).toBe(1);
  });

  it("phantom reduces zegon damage by 15%", () => {
    const config = createStandardDuelWithArchetype("phantom");
    const outcome = resolveRound(
      {
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
        isDeadeye: false,
        modifiers: config.modifiers,
        archetype: "phantom",
      },
      PlayerAction.FIRE,
      {
        predictedPlayerMove: PlayerAction.FIRE,
        zegonMove: ZegonAction.FIRE,
        confidence: 0.9,
        taunt: "test",
      },
    );

    expect(outcome.playerDamage).toBe(Math.round(20 * 0.85));
  });

  it("gambler picks rotating weapons from seed", () => {
    const config = createStandardDuelWithArchetype("gambler");
    const controller = new DuelController(new DummyZegonBrain(config.seed), config);
    expect(controller.getState().weapon).toBe(getGamblerWeapon(config.seed!, 0));
    expect(getGamblerWeapon(config.seed!, 1)).not.toBe(
      getGamblerWeapon(config.seed!, 0),
    );
  });
});

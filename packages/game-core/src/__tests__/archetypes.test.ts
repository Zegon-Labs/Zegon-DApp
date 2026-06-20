import { describe, it, expect } from "vitest";
import {
  createStandardDuelWithArchetype,
  DuelController,
  DummyZegonBrain,
  getGamblerWeapon,
  PlayerAction,
  resolveRound,
  WeaponId,
  ZegonAction,
} from "../index.js";

describe("archetypes", () => {
  it("reader starts with 90 player HP and +18 blindsight on read", () => {
    const config = createStandardDuelWithArchetype("reader");
    expect(config.initialPlayerHp).toBe(90);
    expect(config.modifiers?.blindsightOnCorrect).toBe(18);

    const controller = new DuelController(new DummyZegonBrain(config.seed), config);
    expect(controller.getState().playerHp).toBe(90);
  });

  it("deadeye starts with 110 player HP and triggers DEADEYE at 85%", () => {
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
        blindsight: 70,
        isDeadeye: false,
        modifiers: config.modifiers,
        archetype: "deadeye",
      },
      PlayerAction.FIRE_HIGH,
      {
        predictedPlayerMove: PlayerAction.FIRE_HIGH,
        zegonMove: ZegonAction.DODGE,
        confidence: 0.8,
        taunt: "test",
      },
    );

    expect(outcome.blindsightAfter).toBeGreaterThanOrEqual(85);
    expect(outcome.deadeyeTriggered).toBe(true);
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
        isDeadeye: false,
        modifiers: config.modifiers,
        archetype: "phantom",
      },
      PlayerAction.RELOAD,
      {
        predictedPlayerMove: PlayerAction.DODGE,
        zegonMove: ZegonAction.FIRE_HIGH,
        confidence: 0.5,
        taunt: "test",
      },
    );

    expect(outcome.playerDamage).toBe(Math.round(25 * 0.5 * 0.85));
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

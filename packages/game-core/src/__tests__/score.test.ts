import { describe, it, expect } from "vitest";
import {
  calculateScoreFromState,
  sumCumulativeRoundScores,
  surpriseStreakBonus,
  timesReadPenalty,
  estimateLiveScore,
  estimateLiveScoreRaw,
  scoreDeltaFromLastRound,
  scorePointsForRound,
  PlayerAction,
  DuelItemId,
} from "../index.js";
import { DuelPhase } from "../types/index.js";
import type { DuelState, RoundLogEntry } from "../types/index.js";

function mockLog(predictionCorrect: boolean, roundIndex: number): RoundLogEntry {
  return {
    roundIndex,
    playerAction: PlayerAction.FIRE,
    zegonDecision: {
      predictedPlayerMove: PlayerAction.FIRE,
      zegonMove: "FIRE" as never,
      confidence: 0.5,
      taunt: "",
    },
    predictionCorrect,
  };
}

function mockState(
  logs: RoundLogEntry[],
  overrides: Partial<DuelState> = {},
): DuelState {
  return {
    phase: DuelPhase.DUEL_END,
    roundIndex: logs.length,
    playerHp: 80,
    zegonHp: 0,
    weapon: "REVOLVER" as never,
    ammo: 6,
    blindsight: 0,
    readingStreak: 0,
    equippedItem: "SMOKE" as never,
    itemCooldown: 0,
    isDeadeye: false,
    playerHistory: [],
    roundsWonByPlayer: 5,
    roundsWonByZegon: 0,
    pendingZegonDecision: null,
    roundLogs: logs,
    config: {
      maxRounds: 999,
      initialPlayerHp: 100,
      initialZegonHp: 100,
      weapon: "REVOLVER" as never,
      mode: "standard",
    },
    ...overrides,
  };
}

describe("score calculation", () => {
  it("escalates read penalties", () => {
    expect(timesReadPenalty(0)).toBe(15);
    expect(timesReadPenalty(1)).toBe(20);
    expect(timesReadPenalty(2)).toBe(25);
  });

  it("awards surprise streak bonuses", () => {
    expect(surpriseStreakBonus(1)).toBe(0);
    expect(surpriseStreakBonus(2)).toBe(8);
    expect(surpriseStreakBonus(4)).toBe(20);
  });

  it("rewards clean victory over messy win", () => {
    const clean = mockState(
      Array.from({ length: 8 }, (_, i) => mockLog(false, i)),
      { playerHp: 60, zegonHp: 0 },
    );
    const messy = mockState(
      [
        mockLog(true, 0),
        mockLog(true, 1),
        mockLog(true, 2),
        ...Array.from({ length: 5 }, (_, i) => mockLog(false, i + 3)),
      ],
      { playerHp: 60, zegonHp: 0 },
    );

    const cleanScore = calculateScoreFromState(clean).total;
    const messyScore = calculateScoreFromState(messy).total;
    expect(cleanScore).toBeGreaterThan(messyScore);
  });

  it("caps score on defeat", () => {
    const loss = mockState(
      Array.from({ length: 10 }, (_, i) => mockLog(false, i)),
      {
        playerHp: 0,
        zegonHp: 40,
        roundsWonByPlayer: 0,
        roundsWonByZegon: 3,
        readingStreak: 0,
      },
    );
    const calc = calculateScoreFromState(loss);
    expect(calc.defeatCapApplied).toBe(true);
    expect(calc.total).toBeLessThan(200);
  });

  it("sums running score snapshots for Ghost board metric", () => {
    const logs = [
      mockLog(false, 0),
      mockLog(false, 1),
      mockLog(true, 2),
    ];
    const total = sumCumulativeRoundScores(logs);
    expect(total).toBe(8 + (8 + 8 + 8) + (8 + 8 + 8 - 15));
  });

  it("shows negative live score when heavily read", () => {
    const readHeavy = mockState(
      [mockLog(true, 0), mockLog(true, 1), mockLog(true, 2)],
      { readingStreak: 3, zegonHp: 50, playerHp: 80 },
    );
    const raw = estimateLiveScoreRaw(readHeavy);
    expect(raw).toBeLessThan(0);
    expect(estimateLiveScore(readHeavy)).toBe(raw);
  });

  it("applies read streak penalty only in final score, not live HUD", () => {
    const logs = [mockLog(true, 0), mockLog(true, 1)];
    const state = mockState(logs, {
      readingStreak: 2,
      zegonHp: 50,
      playerHp: 0,
      roundsWonByZegon: 2,
    });
    expect(estimateLiveScoreRaw(state)).toBe(-35);
    const calc = calculateScoreFromState(state);
    expect(calc.readStreakPenalty).toBe(50);
    expect(calc.subtotal).toBe(-85);
  });

  it("uses per-round delta for HUD popups", () => {
    const logs = [mockLog(false, 0), mockLog(false, 1), mockLog(true, 2)];
    expect(scorePointsForRound(logs[0]!, 0, 0)).toBe(8);
    expect(scorePointsForRound(logs[1]!, 0, 1)).toBe(16);
    expect(scorePointsForRound(logs[2]!, 0, 2)).toBe(-15);
    expect(scoreDeltaFromLastRound(logs)).toBe(-15);
  });
});

describe("DummyZegonBrain alternation", () => {
  it("reads alternating FIRE-DODGE at least 35% over 12 rounds", async () => {
    const { DummyZegonBrain } = await import("../index.js");

    let reads = 0;
    const rounds = 12;
    const history: PlayerAction[] = [];

    const brain = new DummyZegonBrain("alt-direct");

    for (let r = 0; r < rounds; r++) {
      const nextAction = r % 2 === 0 ? PlayerAction.FIRE : PlayerAction.DODGE;
      const decision = await brain.decide({
        roundIndex: r,
        playerHistory: history,
        playerHp: 100,
        zegonHp: 100,
        weapon: "REVOLVER" as never,
        ammo: 6,
        blindsight: 0,
        readingStreak: 0,
        equippedItem: DuelItemId.SMOKE,
        itemCooldown: 0,
        isDeadeye: false,
        archetype: "reader",
        timesReadSoFar: 0,
      });
      if (decision.predictedPlayerMove === nextAction) reads += 1;
      history.push(nextAction);
    }

    expect(reads / rounds).toBeGreaterThanOrEqual(0.35);
  });
});

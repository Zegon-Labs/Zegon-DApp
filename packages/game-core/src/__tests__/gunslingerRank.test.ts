import { describe, it, expect } from "vitest";
import {
  rankMonotonicMerge,
  clampGunslingerRank,
  canRequestManualGunslingerEval,
  shouldAutoEvaluateGunslinger,
  gunslingerPortraitPath,
  GUNSLINGER_MANUAL_EVAL_COOLDOWN_MS,
} from "../progression/gunslingerRank.js";

describe("gunslingerRank", () => {
  it("clamps rank to 1-5", () => {
    expect(clampGunslingerRank(0)).toBe(1);
    expect(clampGunslingerRank(3)).toBe(3);
    expect(clampGunslingerRank(99)).toBe(5);
  });

  it("never decreases rank on merge", () => {
    expect(rankMonotonicMerge(4, 2)).toBe(4);
    expect(rankMonotonicMerge(2, 4)).toBe(4);
    expect(rankMonotonicMerge(0, 3)).toBe(3);
  });

  it("builds portrait paths with encoded spaces", () => {
    expect(gunslingerPortraitPath(1, "man")).toBe("/character/man/The%20Outsider.png");
    expect(gunslingerPortraitPath(2, "woman")).toBe(
      "/character/woman/Powder%20Apprentice%20M.png",
    );
  });

  it("gates manual eval by duels and cooldown", () => {
    expect(canRequestManualGunslingerEval(2, null).ok).toBe(false);
    expect(canRequestManualGunslingerEval(5, null).ok).toBe(true);
    const recent = {
      evaluatedAt: Date.now(),
      duelsAtEvaluation: 5,
      lastManualEvalAt: Date.now(),
    };
    expect(canRequestManualGunslingerEval(10, recent).ok).toBe(false);
    expect(
      canRequestManualGunslingerEval(10, {
        ...recent,
        lastManualEvalAt: Date.now() - GUNSLINGER_MANUAL_EVAL_COOLDOWN_MS - 1,
      }).ok,
    ).toBe(true);
  });

  it("does not block re-eval with NEED_DUELS once already evaluated", () => {
    const evaluated = { evaluatedAt: Date.now(), duelsAtEvaluation: 8 };
    expect(canRequestManualGunslingerEval(2, evaluated)).toEqual({
      ok: false,
      reason: "NEED_NEW_DUELS",
    });
    expect(canRequestManualGunslingerEval(11, evaluated).ok).toBe(true);
  });

  it("auto eval every 10 duels since last", () => {
    expect(shouldAutoEvaluateGunslinger(5, null)).toBe(true);
    expect(
      shouldAutoEvaluateGunslinger(14, { evaluatedAt: 1, duelsAtEvaluation: 5 }),
    ).toBe(false);
    expect(
      shouldAutoEvaluateGunslinger(15, { evaluatedAt: 1, duelsAtEvaluation: 5 }),
    ).toBe(true);
  });
});

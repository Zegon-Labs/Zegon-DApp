import { describe, it, expect } from "vitest";
import {
  computeReadingStreakAfter,
  getEffectiveDeadeyeStreak,
  readingStreakToDisplay,
} from "../combat/readingStreak.js";

describe("readingStreak", () => {
  it("increments on correct read", () => {
    expect(computeReadingStreakAfter(0, true, false, false)).toBe(1);
    expect(computeReadingStreakAfter(1, true, false, false)).toBe(2);
  });

  it("resets on wrong read or smoke", () => {
    expect(computeReadingStreakAfter(2, false, false, false)).toBe(0);
    expect(computeReadingStreakAfter(2, true, true, false)).toBe(0);
  });

  it("resets after deadeye consumed", () => {
    expect(computeReadingStreakAfter(2, true, false, true)).toBe(0);
  });

  it("holds streak when plate blocks a read shot", () => {
    expect(computeReadingStreakAfter(2, true, false, false, true)).toBe(2);
  });

  it("maps streak to display intensity", () => {
    expect(readingStreakToDisplay(0, 2)).toBe(0);
    expect(readingStreakToDisplay(1, 2)).toBe(55);
    expect(readingStreakToDisplay(2, 2)).toBe(100);
  });

  it("deadeye archetype triggers at streak 1", () => {
    expect(getEffectiveDeadeyeStreak({ deadeyeStreak: 1 })).toBe(1);
  });
});

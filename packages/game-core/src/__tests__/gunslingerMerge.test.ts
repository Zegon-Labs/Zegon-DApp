import { describe, it, expect } from "vitest";
import { rankMonotonicMerge } from "../progression/gunslingerRank.js";

describe("gunslinger profile merge rules", () => {
  it("preserves higher rank when proposed rank is lower", () => {
    expect(rankMonotonicMerge(4, 2)).toBe(4);
    expect(rankMonotonicMerge(5, 1)).toBe(5);
  });

  it("promotes when proposed rank is higher", () => {
    expect(rankMonotonicMerge(2, 4)).toBe(4);
    expect(rankMonotonicMerge(0, 3)).toBe(3);
  });
});

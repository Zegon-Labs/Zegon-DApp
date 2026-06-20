import { describe, it, expect } from "vitest";
import { createDailyDuel, getDailySeed } from "../index.js";

describe("DailyDuel", () => {
  it("same date produces same seed", () => {
    const date = new Date("2026-06-18T12:00:00Z");
    expect(getDailySeed(date)).toBe("2026-06-18");
  });

  it("same date produces same config", () => {
    const date = new Date("2026-06-18T12:00:00Z");
    const a = createDailyDuel(date);
    const b = createDailyDuel(date);
    expect(a).toEqual(b);
    expect(a.mode).toBe("daily");
    expect(a.seed).toMatch(/^2026-06-18-/);
    expect(a.archetype).toBeDefined();
  });

  it("different dates may differ", () => {
    const a = createDailyDuel(new Date("2026-06-18T12:00:00Z"));
    const b = createDailyDuel(new Date("2026-06-19T12:00:00Z"));
    expect(a.seed).not.toBe(b.seed);
  });
});

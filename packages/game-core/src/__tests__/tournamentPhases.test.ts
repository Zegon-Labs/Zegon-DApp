import { describe, expect, it } from "vitest";
import { getTournamentPhaseInfo, TOURNAMENT_PHASES } from "../constants/tournamentPhases.js";

describe("getTournamentPhaseInfo", () => {
  it("returns upcoming before Jul 9", () => {
    const info = getTournamentPhaseInfo(Date.parse("2026-07-08T12:00:00.000Z"));
    expect(info.status).toBe("upcoming");
    expect(info.phase?.id).toBe("s1");
    expect(info.msRemaining).toBeGreaterThan(0);
  });

  it("returns active phase 1 during Jul 9–12", () => {
    const info = getTournamentPhaseInfo(Date.parse("2026-07-10T12:00:00.000Z"));
    expect(info.status).toBe("active");
    expect(info.phase?.id).toBe("s1");
  });

  it("transitions to phase 2 on Jul 13", () => {
    const info = getTournamentPhaseInfo(Date.parse("2026-07-13T00:00:00.000Z"));
    expect(info.status).toBe("active");
    expect(info.phase?.id).toBe("s2");
  });

  it("transitions to phase 3 on Jul 16", () => {
    const info = getTournamentPhaseInfo(Date.parse("2026-07-16T00:00:00.000Z"));
    expect(info.status).toBe("active");
    expect(info.phase?.id).toBe("s3");
  });

  it("returns ended after Jul 19", () => {
    const info = getTournamentPhaseInfo(Date.parse("2026-07-20T00:00:00.000Z"));
    expect(info.status).toBe("ended");
    expect(info.phase).toBeNull();
    expect(info.msRemaining).toBe(0);
  });

  it("has three consecutive phases", () => {
    expect(TOURNAMENT_PHASES).toHaveLength(3);
    expect(TOURNAMENT_PHASES[0]!.endAt).toBe(TOURNAMENT_PHASES[1]!.startAt);
    expect(TOURNAMENT_PHASES[1]!.endAt).toBe(TOURNAMENT_PHASES[2]!.startAt);
  });
});

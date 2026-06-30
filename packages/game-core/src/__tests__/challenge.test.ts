import { describe, expect, it } from "vitest";
import {
  buildChallengeUrl,
  decodeChallengePayload,
  encodeChallengePayload,
  parseChallengeFromSearch,
} from "../modes/challenge.js";

describe("challenge payload", () => {
  it("round-trips score, name and duel id", () => {
    const payload = {
      seed: "standard-reader",
      archetype: "reader",
      mode: "standard" as const,
      challengerScore: 1240,
      challengerName: "Cbiux",
      challengerDuelId: "abc123",
    };
    const encoded = encodeChallengePayload(payload);
    const decoded = decodeChallengePayload(encoded);
    expect(decoded.config.mode).toBe("challenge");
    expect(decoded.config.archetype).toBe("reader");
    expect(decoded.meta.challengerScore).toBe(1240);
    expect(decoded.meta.challengerName).toBe("Cbiux");
    expect(decoded.meta.challengerDuelId).toBe("abc123");
  });

  it("builds shareable challenge URLs", () => {
    const url = buildChallengeUrl("https://zegon.test/", {
      seed: "daily-2026-06-26",
      challengerScore: 900,
      challengerName: "Ace",
    });
    expect(url).toContain("challenge=");
    expect(url.startsWith("https://zegon.test/?challenge=")).toBe(true);
  });

  it("parses challenge from search params", () => {
    const url = buildChallengeUrl("https://zegon.test/", {
      challengerScore: 500,
      challengerName: "Test",
    });
    const search = url.split("?")[1] ?? "";
    const parsed = parseChallengeFromSearch(search);
    expect(parsed?.meta.challengerScore).toBe(500);
    expect(parsed?.meta.challengerName).toBe("Test");
  });
});

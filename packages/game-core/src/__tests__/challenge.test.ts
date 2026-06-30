import { describe, expect, it } from "vitest";
import {
  buildChallengeUrl,
  buildShortChallengeUrl,
  decodeChallengeCompact,
  decodeChallengePayload,
  encodeChallengeCompact,
  encodeChallengePayload,
  isShortChallengeId,
  parseChallengeFromSearch,
  resolveChallengeFromSearch,
} from "../modes/challenge.js";

describe("challenge payload", () => {
  it("round-trips score, name and duel id (legacy base64)", () => {
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

  it("round-trips compact challenge tokens", () => {
    const payload = {
      archetype: "reader",
      mode: "standard" as const,
      challengerScore: 1240,
      challengerName: "Cbiux",
    };
    const token = encodeChallengeCompact(payload);
    expect(token.startsWith("v1.")).toBe(true);
    expect(token.length).toBeLessThan(40);

    const decoded = decodeChallengeCompact(token);
    expect(decoded.meta.challengerScore).toBe(1240);
    expect(decoded.meta.challengerName).toBe("Cbiux");
    expect(decoded.config.archetype).toBe("reader");
  });

  it("builds short compact challenge URLs", () => {
    const url = buildChallengeUrl("https://zegon.test/", {
      challengerScore: 900,
      challengerName: "Ace",
      archetype: "phantom",
    });
    expect(url).toContain("?c=v1.");
    expect(url.length).toBeLessThan(80);
  });

  it("builds ultra-short server id URLs", () => {
    const url = buildShortChallengeUrl("https://zegon.test/", "abc123");
    expect(url).toBe("https://zegon.test/?c=abc123");
    expect(isShortChallengeId("abc123")).toBe(true);
    expect(isShortChallengeId("v1.ya8.0.s.Ace")).toBe(false);
  });

  it("parses compact c param from search", () => {
    const url = buildChallengeUrl("https://zegon.test/", {
      challengerScore: 500,
      challengerName: "Test",
    });
    const search = url.split("?")[1] ?? "";
    const parsed = parseChallengeFromSearch(search);
    expect(parsed?.meta.challengerScore).toBe(500);
    expect(parsed?.meta.challengerName).toBe("Test");
  });

  it("resolves short ids via fetch callback", async () => {
    const parsed = await resolveChallengeFromSearch("?c=abc123", async (id) => {
      expect(id).toBe("abc123");
      return { challengerScore: 777, challengerName: "Z" };
    });
    expect(parsed?.meta.challengerScore).toBe(777);
  });
});

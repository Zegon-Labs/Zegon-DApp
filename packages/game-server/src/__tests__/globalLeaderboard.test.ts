import { describe, expect, it } from "vitest";
import { handleGlobalLeaderboard, handleGlobalSubmit } from "../handlers/duelHandlers.js";

describe("global leaderboard handlers", () => {
  it("returns entries array from handleGlobalLeaderboard", async () => {
    const result = await handleGlobalLeaderboard();
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it("rejects submit without wallet profile", async () => {
    const result = await handleGlobalSubmit({
      playerId: "not-a-wallet",
      score: 100,
    });
    expect(result.accepted).toBe(false);
  });
});

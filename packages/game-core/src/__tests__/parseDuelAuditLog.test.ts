import { describe, expect, it } from "vitest";
import { parseDuelAuditPayload } from "../audit/parseDuelAuditLog.js";

describe("parseDuelAuditPayload", () => {
  it("maps storage payload to round rows", () => {
    const parsed = parseDuelAuditPayload({
      duelId: "abc",
      storedAt: 1,
      logs: [
        {
          roundIndex: 0,
          commitHash: "0xcommit",
          playerAction: "FIRE",
          predictionCorrect: true,
          decision: { predictedPlayerMove: "FIRE", zegonMove: "DODGE", taunt: "read" },
        },
      ],
    });
    expect(parsed?.duelId).toBe("abc");
    expect(parsed?.rounds).toHaveLength(1);
    expect(parsed?.rounds[0]?.playerAction).toBe("FIRE");
    expect(parsed?.rounds[0]?.predictedMove).toBe("FIRE");
  });
});

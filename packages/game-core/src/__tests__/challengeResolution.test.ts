import { describe, expect, it } from "vitest";
import { resolveStyleChallenge } from "../modes/challengeResolution.js";

describe("resolveStyleChallenge", () => {
  it("defender wins when only defender won", () => {
    expect(resolveStyleChallenge(false, true)).toBe("defender");
  });

  it("challenger wins when only challenger won", () => {
    expect(resolveStyleChallenge(true, false)).toBe("challenger");
  });

  it("draw when both won", () => {
    expect(resolveStyleChallenge(true, true)).toBe("draw");
  });

  it("draw when both lost", () => {
    expect(resolveStyleChallenge(false, false)).toBe("draw");
  });
});

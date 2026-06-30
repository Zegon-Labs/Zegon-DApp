import { describe, expect, it } from "vitest";
import {
  createChallengeLink,
  getChallengeLink,
} from "../services/challengeLinks.js";

describe("challenge short links", () => {
  it("creates and retrieves a short challenge id", async () => {
    const payload = {
      challengerScore: 420,
      challengerName: "Ace",
      archetype: "reader",
    };
    const { id } = await createChallengeLink(payload);
    expect(id).toMatch(/^[a-z0-9]{6}$/);

    const stored = await getChallengeLink(id);
    expect(stored?.payload).toMatchObject(payload);
  });
});

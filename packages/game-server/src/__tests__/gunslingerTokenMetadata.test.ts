import { describe, it, expect } from "vitest";
import { buildGunslingerTokenMetadata } from "../services/gunslingerTokenMetadata.js";
import type { PlayerProfile } from "../services/profileTypes.js";

function sampleProfile(bioLang: "en" | "es"): PlayerProfile {
  return {
    address: "0x1234567890123456789012345678901234567890",
    nickname: "Cbiux",
    createdAt: 1,
    updatedAt: 1,
    stats: {
      duelsWon: 2,
      duelsPlayed: 5,
      bestDailyScore: 0,
      bestGlobalScore: 0,
      timesReadTotal: 3,
      totalRoundsPlayed: 20,
      totalRoundScore: 100,
      maxReadingStreak: 2,
      totalPlayTimeMs: 0,
      fastestWinMs: null,
      verifiedDuels: 1,
      streakDays: 0,
    },
    gunslinger: {
      rank: 1,
      bio:
        bioLang === "es"
          ? "Has sobrevivido 5 duelos contra el ciego."
          : "You have survived 5 duels against the blind.",
      bioLang,
      characterGender: "man",
      evaluatedAt: Date.now(),
      duelsAtEvaluation: 5,
    },
  };
}

describe("buildGunslingerTokenMetadata", () => {
  it("uses English for primary NFT fields", () => {
    const metadata = buildGunslingerTokenMetadata(sampleProfile("es"));
    expect(metadata?.name).toBe("Cbiux — The Outsider");
    expect(metadata?.description).toContain("ZEGON judged Cbiux");
    expect((metadata?.attributes as { trait_type: string; value: string }[])[0]?.value).toBe(
      "The Outsider",
    );
  });

  it("includes Spanish localization when bio is stored in Spanish", () => {
    const metadata = buildGunslingerTokenMetadata(sampleProfile("es"));
    const localization = metadata?.localization as {
      es?: { name?: string; description?: string };
    };
    expect(localization?.es?.name).toBe("Cbiux — El Forastero");
    expect(localization?.es?.description).toContain("Has sobrevivido");
  });

  it("uses stored bio as description when profile bio is English", () => {
    const metadata = buildGunslingerTokenMetadata(sampleProfile("en"));
    expect(metadata?.description).toBe("You have survived 5 duels against the blind.");
    expect(metadata?.localization).toBeUndefined();
  });
});

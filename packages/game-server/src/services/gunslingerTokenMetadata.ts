import {
  gunslingerPortraitPath,
  gunslingerRankName,
} from "@zegon/game-core";
import type { GunslingerProfile, PlayerProfile } from "./profileTypes.js";

/** On-chain / wallet metadata is English-first (OpenSea & explorer convention). */
export const GUNSLINGER_NFT_METADATA_LANG = "en" as const;

export function publicAppBaseUrl(): string {
  return (
    process.env.GUNSLINGER_PUBLIC_BASE_URL ??
    (process.env.SIWE_DOMAIN ? `https://${process.env.SIWE_DOMAIN}` : "https://www.zegonduel.com")
  );
}

export function gunslingerTokenMetadataUrl(address: string): string {
  const base = publicAppBaseUrl();
  return `${base}/api/player/gunslinger/token-metadata?address=${encodeURIComponent(address)}`;
}

export function resolveGunslingerMetadataUrl(
  address: string,
  storedRootOrUri?: string,
): string | undefined {
  if (!storedRootOrUri) return gunslingerTokenMetadataUrl(address);
  if (storedRootOrUri.startsWith("https://")) return storedRootOrUri;
  if (storedRootOrUri.startsWith("http://")) return storedRootOrUri;
  return `https://indexer-storage-turbo.0g.ai/download?root=${encodeURIComponent(storedRootOrUri)}`;
}

function gunslingerNftEnglishDescription(
  profile: PlayerProfile,
  gs: GunslingerProfile,
): string {
  if (gs.bioLang === "en") return gs.bio;
  const rankName = gunslingerRankName(gs.rank, "en");
  return `ZEGON judged ${profile.nickname} as ${rankName}. Gunslinger identity earned through blind duels on ZEGON Duel (0G Galileo).`;
}

export function buildGunslingerTokenMetadata(
  profile: PlayerProfile,
  _lang?: "en" | "es",
): Record<string, unknown> | null {
  const gs = profile.gunslinger;
  if (!gs?.rank || !gs.bio || !gs.evaluatedAt) return null;

  const gender = gs.characterGender ?? "man";
  const base = publicAppBaseUrl();
  const portraitPath = gunslingerPortraitPath(gs.rank, gender);
  const rankNameEn = gunslingerRankName(gs.rank, "en");
  const characterTrait = gender === "woman" ? "Woman" : "Man";

  const metadata: Record<string, unknown> = {
    name: `${profile.nickname} — ${rankNameEn}`,
    description: gunslingerNftEnglishDescription(profile, gs),
    image: `${base}${portraitPath}`,
    external_url: base,
    attributes: [
      { trait_type: "Rank", value: rankNameEn },
      { trait_type: "Rank Level", value: gs.rank },
      { trait_type: "Nickname", value: profile.nickname },
      { trait_type: "Duels Won", value: profile.stats.duelsWon },
      { trait_type: "Duels Played", value: profile.stats.duelsPlayed },
      { trait_type: "Verified Duels", value: profile.stats.verifiedDuels },
      { trait_type: "Character", value: characterTrait },
    ],
  };

  if (gs.bioLang === "es") {
    metadata.localization = {
      es: {
        name: `${profile.nickname} — ${gunslingerRankName(gs.rank, "es")}`,
        description: gs.bio,
      },
    };
  }

  return metadata;
}

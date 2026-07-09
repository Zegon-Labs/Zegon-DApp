import {
  gunslingerPortraitPath,
  gunslingerRankName,
} from "@zegon/game-core";
import type { PlayerProfile } from "./profileTypes.js";

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

export function buildGunslingerTokenMetadata(
  profile: PlayerProfile,
  lang: "en" | "es",
): Record<string, unknown> | null {
  const gs = profile.gunslinger;
  if (!gs?.rank || !gs.bio || !gs.evaluatedAt) return null;

  const gender = gs.characterGender ?? "man";
  const base = publicAppBaseUrl();
  const portraitPath = gunslingerPortraitPath(gs.rank, gender);
  const rankName = gunslingerRankName(gs.rank, lang);

  return {
    name: `${profile.nickname} — ${rankName}`,
    description: gs.bio,
    image: `${base}${portraitPath}`,
    external_url: base,
    attributes: [
      { trait_type: "Rank", value: rankName },
      { trait_type: "Rank Level", value: gs.rank },
      { trait_type: "Nickname", value: profile.nickname },
      { trait_type: "Duels Won", value: profile.stats.duelsWon },
      { trait_type: "Duels Played", value: profile.stats.duelsPlayed },
      { trait_type: "Verified Duels", value: profile.stats.verifiedDuels },
      { trait_type: "Character", value: gender === "woman" ? "Woman" : "Man" },
    ],
  };
}

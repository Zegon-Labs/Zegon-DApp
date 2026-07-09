import {
  canRequestManualGunslingerEval,
  type CharacterGender,
} from "@zegon/game-core";
import { evaluateGunslingerRank } from "../services/gunslingerEvaluate.js";
import { getGunslingerNftService } from "../services/gunslingerNft.js";
import {
  buildGunslingerTokenMetadata,
  resolveGunslingerMetadataUrl,
} from "../services/gunslingerTokenMetadata.js";
import {
  getProfile,
  saveGunslingerNft,
  setGunslingerGender,
  updateGunslingerProfile,
  isWalletAddress,
} from "../services/playerProfiles.js";
import { requireSiweOrDev } from "../services/db.js";

export async function handleGunslingerEvaluate(body: {
  address: string;
  lang?: "en" | "es";
  manual?: boolean;
  auth?: { message?: string; signature?: string };
}): Promise<
  | { accepted: true; profile: NonNullable<Awaited<ReturnType<typeof getProfile>>> }
  | { accepted: false; reason: string }
> {
  if (!isWalletAddress(body.address)) {
    return { accepted: false, reason: "INVALID_ADDRESS" };
  }

  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) return { accepted: false, reason: siwe.error };

  const profile = await getProfile(body.address);
  if (!profile) return { accepted: false, reason: "PROFILE_REQUIRED" };

  if (body.manual) {
    const gate = canRequestManualGunslingerEval(profile.stats.duelsPlayed, profile.gunslinger);
    if (!gate.ok) {
      return { accepted: false, reason: gate.reason };
    }
  }

  const lang = body.lang === "es" ? "es" : "en";
  const evalResult = await evaluateGunslingerRank(profile, lang);
  if (!evalResult.rank) {
    return { accepted: false, reason: "INSUFFICIENT_DUELS" };
  }

  const updated = await updateGunslingerProfile(
    body.address,
    {
      rank: evalResult.rank,
      bio: evalResult.bio,
      bioLang: lang,
      characterGender: profile.gunslinger?.characterGender ?? "man",
    },
    { manual: body.manual, duelsPlayed: profile.stats.duelsPlayed },
  );

  return { accepted: true, profile: updated };
}

export async function handleGunslingerPreference(body: {
  address: string;
  characterGender: CharacterGender;
  auth?: { message?: string; signature?: string };
}): Promise<
  | { accepted: true; profile: NonNullable<Awaited<ReturnType<typeof getProfile>>> }
  | { accepted: false; reason: string }
> {
  if (!isWalletAddress(body.address)) {
    return { accepted: false, reason: "INVALID_ADDRESS" };
  }
  if (body.characterGender !== "man" && body.characterGender !== "woman") {
    return { accepted: false, reason: "INVALID_GENDER" };
  }

  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) return { accepted: false, reason: siwe.error };

  const profile = await setGunslingerGender(body.address, body.characterGender);
  return { accepted: true, profile };
}

export async function handleGunslingerMint(body: {
  address: string;
  lang?: "en" | "es";
  auth?: { message?: string; signature?: string };
}): Promise<
  | {
      accepted: true;
      profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
      mint: Awaited<ReturnType<ReturnType<typeof getGunslingerNftService>["mintOrUpdate"]>>;
    }
  | { accepted: false; reason: string }
> {
  if (!isWalletAddress(body.address)) {
    return { accepted: false, reason: "INVALID_ADDRESS" };
  }

  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) return { accepted: false, reason: siwe.error };

  const profile = await getProfile(body.address);
  if (!profile?.gunslinger?.rank) {
    return { accepted: false, reason: "GUNSLINGER_NOT_EVALUATED" };
  }

  const nftService = getGunslingerNftService();
  if (!nftService.isConfigured()) {
    return { accepted: false, reason: "CONTRACT_NOT_CONFIGURED" };
  }

  const lang = body.lang === "es" ? "es" : profile.gunslinger.bioLang ?? "en";
  try {
    const mint = await nftService.mintOrUpdate(profile, lang);

    const updated = await saveGunslingerNft(body.address, {
      tokenId: mint.tokenId,
      contractAddress: mint.contractAddress,
      metadataRootHash: mint.metadataRootHash,
      portraitRootHash: mint.portraitRootHash,
      mintedAt: Date.now(),
      txHash: mint.txHash,
      rankAtMint: profile.gunslinger.rank,
    });

    return { accepted: true, profile: updated, mint };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("PORTRAIT")) return { accepted: false, reason: "PORTRAIT_NOT_FOUND" };
    if (message.includes("UPLOAD")) return { accepted: false, reason: "STORAGE_UPLOAD_FAILED" };
    if (message.includes("CONTRACT")) return { accepted: false, reason: "CONTRACT_NOT_CONFIGURED" };
    return { accepted: false, reason: message.slice(0, 120) || "MINT_FAILED" };
  }
}

export async function handleGunslingerMetadata(address: string): Promise<{
  profile: Awaited<ReturnType<typeof getProfile>>;
  metadataUrl?: string;
}> {
  const profile = await getProfile(address);
  const stored = profile?.gunslinger?.nft?.metadataRootHash;
  return {
    profile,
    metadataUrl: isWalletAddress(address)
      ? resolveGunslingerMetadataUrl(address, stored)
      : undefined,
  };
}

export async function handleGunslingerTokenMetadata(address: string): Promise<
  | { ok: true; metadata: Record<string, unknown> }
  | { ok: false; reason: string }
> {
  if (!isWalletAddress(address)) {
    return { ok: false, reason: "INVALID_ADDRESS" };
  }
  const profile = await getProfile(address);
  if (!profile?.gunslinger?.rank) {
    return { ok: false, reason: "GUNSLINGER_NOT_EVALUATED" };
  }
  const lang = profile.gunslinger.bioLang ?? "en";
  const metadata = buildGunslingerTokenMetadata(profile, lang);
  if (!metadata) {
    return { ok: false, reason: "GUNSLINGER_NOT_EVALUATED" };
  }
  return { ok: true, metadata };
}

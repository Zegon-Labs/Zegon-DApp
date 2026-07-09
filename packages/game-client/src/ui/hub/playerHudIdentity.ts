import type Phaser from "phaser";
import { gunslingerPortraitPath, isGunslingerEvaluated } from "@zegon/game-core";
import { displayNameFor, getCachedProfile } from "../../services/profile.js";
import { getWalletAddress } from "../../services/wallet.js";
import { PLAYER_PORTRAIT_KEY } from "./sideHudPanel.js";

const FALLBACK_PORTRAIT = "/sprites/figura_sin_fondo_v2.png";

/** Gunslinger rank portrait for the connected player, or a generic silhouette. */
export function resolvePlayerPortraitPath(): string {
  const wallet = getWalletAddress();
  if (!wallet) return FALLBACK_PORTRAIT;

  const profile = getCachedProfile(wallet);
  const gs = profile?.gunslinger;
  const gender = gs?.characterGender ?? "man";
  const rank = isGunslingerEvaluated(gs) ? (gs?.rank ?? 1) : 1;
  return gunslingerPortraitPath(rank, gender);
}

/** Nickname when wallet + profile exist; truncated address if no nickname; guest label otherwise. */
export function resolvePlayerHudName(guestLabel: string): string {
  const wallet = getWalletAddress();
  if (!wallet) return guestLabel;

  const profile = getCachedProfile(wallet);
  const nickname = profile?.nickname?.trim();
  if (nickname) return nickname;
  return displayNameFor(wallet);
}

export function preloadPlayerPortrait(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_PORTRAIT_KEY)) {
    scene.textures.remove(PLAYER_PORTRAIT_KEY);
  }
  scene.load.image(PLAYER_PORTRAIT_KEY, resolvePlayerPortraitPath());
}

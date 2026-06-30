import {
  buildChallengeUrl,
  buildShareTweetText,
  buildTwitterIntentUrl,
  DuelWinner,
  type ChallengeMeta,
  type ChallengePayload,
  type DuelResult,
} from "@zegon/game-core";
import { getCachedProfile } from "../services/profile.js";
import { getWalletAddress } from "../services/wallet.js";

const ASSETS = {
  bg: "/landing/bg.png",
  logo: "/landing/logo.png",
  character: "/landing/character.png",
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Draw an image covering a box, cropping overflow while preserving aspect ratio. */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Draw an image fully inside a box, preserving aspect ratio (no distortion). */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  align: "left" | "center" | "right" = "center",
): void {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = align === "left" ? x : align === "right" ? x + (w - dw) : x + (w - dw) / 2;
  const dy = y + (h - dh);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawHudFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = "rgba(46, 230, 214, 0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.strokeStyle = "rgba(255, 77, 46, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, w - 64, h - 64);
}

function winnerHeadline(result: DuelResult): string {
  if (result.winner === DuelWinner.PLAYER) return "I OUTDREW ZEGON";
  if (result.winner === DuelWinner.ZEGON) return "ZEGON READ ME";
  return "DEAD HEAT";
}

export interface ShareCardMeta {
  archetype?: string;
  brainMode?: string;
  verifyProof?: string;
}

export function buildChallengePayloadFromResult(
  result: DuelResult,
  options: {
    seed: string;
    archetype?: string;
    duelId?: string | null;
    mode?: "standard" | "daily";
  },
): ChallengePayload {
  const address = getWalletAddress();
  const profile = address ? getCachedProfile(address) : null;
  const challengerName =
    profile?.nickname ??
    (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined);

  return {
    seed: options.seed,
    archetype: options.archetype,
    mode: options.mode === "daily" ? "daily" : "standard",
    challengerScore: result.score,
    challengerName,
    challengerDuelId: options.duelId ?? undefined,
  };
}

export function buildChallengeUrlFromResult(
  result: DuelResult,
  options: {
    seed: string;
    archetype?: string;
    duelId?: string | null;
    mode?: "standard" | "daily";
  },
): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://zegon-dapp.vercel.app";
  return buildChallengeUrl(
    `${base}/`,
    buildChallengePayloadFromResult(result, options),
  );
}

export function buildShareOnXUrl(
  result: DuelResult,
  options: {
    seed: string;
    archetype?: string;
    duelId?: string | null;
    mode?: "standard" | "daily";
    verifyProof?: string;
  },
): string {
  const challengeUrl = buildChallengeUrlFromResult(result, options);
  const text = buildShareTweetText({
    score: result.score,
    verifyRounds: options.verifyProof,
  });
  return buildTwitterIntentUrl(text, challengeUrl);
}

export async function shareOnX(
  result: DuelResult,
  options: Parameters<typeof buildShareOnXUrl>[1],
): Promise<void> {
  const url = buildShareOnXUrl(result, options);
  window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function generateShareCard(
  result: DuelResult,
  meta: ShareCardMeta,
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    const [bg, logo, character] = await Promise.all([
      loadImage(ASSETS.bg),
      loadImage(ASSETS.logo),
      loadImage(ASSETS.character),
    ]);

    drawImageCover(ctx, bg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(10, 9, 17, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawHudFrame(ctx, canvas.width, canvas.height);

    drawImageContain(ctx, logo, 48, 42, 240, 78, "left");
    drawImageContain(ctx, character, 720, 70, 420, 520, "right");

    ctx.fillStyle = "#E6E1D3";
    ctx.font = "bold 44px monospace";
    ctx.fillText(winnerHeadline(result), 56, 170);

    ctx.fillStyle = "#2EE6D6";
    ctx.font = "bold 96px monospace";
    ctx.fillText(String(result.score), 56, 290);

    ctx.fillStyle = "#9A93A8";
    ctx.font = "28px monospace";
    const resultLabel =
      result.winner === DuelWinner.PLAYER
        ? "WIN"
        : result.winner === DuelWinner.ZEGON
          ? "LOSS"
          : "DRAW";
    ctx.fillText(`RESULT · ${resultLabel}`, 56, 340);
    if (meta.verifyProof) {
      ctx.fillText(`VERIFY · ${meta.verifyProof} rounds sealed first`, 56, 382);
    }
    ctx.fillText(`ROUNDS · ${result.roundsPlayed} · READ ×${result.timesRead}`, 56, 424);

    if (meta.archetype) {
      ctx.fillStyle = "#E8B23A";
      ctx.fillText(`VS ${meta.archetype.toUpperCase()}`, 56, 468);
    }

    ctx.fillStyle = meta.brainMode === "tee" ? "#4DF07A" : "#FF4D2E";
    ctx.font = "24px monospace";
    ctx.fillText("0G Compute + Chain + Storage", 56, 520);
    ctx.fillStyle = "#E6E1D3";
    ctx.fillText("@Zegon_0g", 56, 560);
  } catch {
    ctx.fillStyle = "#0A0911";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2EE6D6";
    ctx.font = "bold 72px monospace";
    ctx.fillText(`ZEGON · ${result.score}`, 60, 200);
  }

  const blob = await canvasToBlob(canvas);
  const filename = `zegon-${result.score}.png`;

  if (blob && navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: "image/png" })] })) {
    try {
      await navigator.share({
        files: [new File([blob], filename, { type: "image/png" })],
        title: "ZEGON",
        text: buildShareTweetText({ score: result.score }),
      });
      return;
    } catch {
      /* fall through to download */
    }
  }

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export type { ChallengeMeta };

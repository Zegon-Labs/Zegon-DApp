import {
  buildChallengeUrl,
  buildShortChallengeUrl,
  buildShareTweetText,
  buildTwitterIntentUrl,
  DuelWinner,
  type ChallengePayload,
  type ChallengeMeta,
  type DuelResult,
} from "@zegon/game-core";
import { getCachedProfile } from "../services/profile.js";
import { getWalletAddress } from "../services/wallet.js";
import { t } from "../i18n/index.js";
import { notify } from "../lib/toast.js";

export interface ShareOptions {
  seed: string;
  archetype?: string;
  duelId?: string | null;
  mode?: "standard" | "daily";
  verifyProof?: string;
  brainMode?: string;
}

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
  nickname?: string;
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
    challengerTimesRead: result.timesRead,
    challengerRounds: result.roundsPlayed,
    challengerWon: result.winner === DuelWinner.PLAYER,
  };
}

export async function buildChallengeUrlFromResult(
  result: DuelResult,
  options: {
    seed: string;
    archetype?: string;
    duelId?: string | null;
    mode?: "standard" | "daily";
  },
): Promise<string> {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://zegon-dapp.vercel.app";
  const payload = buildChallengePayloadFromResult(result, options);
  const home = `${base}/`;

  try {
    const res = await fetch("/api/challenge/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (res.ok) {
      const data = (await res.json()) as { id?: string };
      if (data.id) return buildShortChallengeUrl(home, data.id);
    }
  } catch {
    /* fallback to compact inline link */
  }

  return buildChallengeUrl(home, payload);
}

export async function buildShareOnXUrl(
  result: DuelResult,
  options: ShareOptions,
): Promise<string> {
  const challengeUrl = await buildChallengeUrlFromResult(result, options);
  const text = buildShareTweetText({
    score: result.score,
    verifyRounds: options.verifyProof,
  });
  return buildTwitterIntentUrl(text, challengeUrl);
}

async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    const ClipboardItemCtor = (
      window as unknown as { ClipboardItem?: typeof ClipboardItem }
    ).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([
      new ClipboardItemCtor({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function isCoarsePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Share to X with the generated card image.
 * - Mobile (touch): Web Share API attaches the image directly (user picks X).
 * - Desktop: always open the X composer (text + challenge link) and copy the
 *   card image to the clipboard so it can be pasted with Ctrl+V. We never open
 *   the OS share sheet or auto-download on desktop, so the X tab always opens.
 */
export async function shareOnX(
  result: DuelResult,
  options: ShareOptions,
): Promise<void> {
  const strings = t();
  const url = await buildShareOnXUrl(result, options);
  const filename = `zegon-${result.score}.png`;

  let blob: Blob | null = null;
  try {
    const canvas = await renderShareCardCanvas(result, {
      archetype: options.archetype,
      brainMode: options.brainMode,
      verifyProof: options.verifyProof,
    });
    blob = await canvasToBlob(canvas);
  } catch {
    /* card render failed; still share text + link below */
  }

  const file = blob
    ? new File([blob], filename, { type: "image/png" })
    : null;

  // Touch devices only: native share can attach the actual card image.
  if (isCoarsePointer() && file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: buildShareTweetText({
          score: result.score,
          verifyRounds: options.verifyProof,
        }),
      });
      return;
    } catch {
      /* user cancelled or unsupported — fall back to intent below */
    }
  }

  // Desktop: copy the card to the clipboard (best-effort) so it can be pasted,
  // then always open the X composer.
  const copied = blob ? await copyBlobToClipboard(blob) : false;

  window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");

  if (copied) {
    notify.success(strings.shareImageCopied);
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Render the 1200×630 share card and return the canvas. */
export async function renderShareCardCanvas(
  result: DuelResult,
  meta: ShareCardMeta,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  try {
    const [bg, logo, character] = await Promise.all([
      loadImage(ASSETS.bg),
      loadImage(ASSETS.logo),
      loadImage(ASSETS.character),
    ]);

    drawImageCover(ctx, bg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(10, 9, 17, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Character: larger and anchored to the bottom-right, drawn before the
    // frame/text so the HUD and copy stay crisp on top of it.
    const charW = 560;
    const charH = 612;
    const charX = canvas.width - charW - 18;
    const charY = canvas.height - charH;
    // Soft gradient behind the character so it blends into the card edge.
    const fade = ctx.createLinearGradient(charX, 0, charX + charW, 0);
    fade.addColorStop(0, "rgba(10, 9, 17, 0)");
    fade.addColorStop(0.4, "rgba(10, 9, 17, 0)");
    ctx.fillStyle = fade;
    ctx.fillRect(charX, 0, charW, canvas.height);
    drawImageContain(ctx, character, charX, charY, charW, charH, "right");

    drawHudFrame(ctx, canvas.width, canvas.height);
    drawImageContain(ctx, logo, 48, 42, 240, 78, "left");

    const wallet = getWalletAddress();
    const nickname =
      meta.nickname ??
      (wallet ? getCachedProfile(wallet)?.nickname : undefined);

    if (nickname) {
      ctx.fillStyle = "#E8B23A";
      ctx.font = "32px monospace";
      ctx.fillText(`@${nickname}`, 56, 130);
    }

    ctx.fillStyle = "#E6E1D3";
    ctx.font = "bold 36px monospace";
    ctx.fillText(winnerHeadline(result), 56, nickname ? 175 : 170);

    ctx.fillStyle = "#FF4D2E";
    ctx.font = "bold 28px monospace";
    ctx.fillText("ZEGON TE LEYÓ", 56, 230);

    ctx.fillStyle = "#2EE6D6";
    ctx.font = "bold 88px monospace";
    ctx.fillText(`${result.timesRead} / ${result.roundsPlayed}`, 56, 320);

    ctx.fillStyle = "#9A93A8";
    ctx.font = "28px monospace";
    ctx.fillText(`SCORE · ${result.score}`, 56, 365);

    const resultLabel =
      result.winner === DuelWinner.PLAYER
        ? "WIN"
        : result.winner === DuelWinner.ZEGON
          ? "LOSS"
          : "DRAW";
    ctx.fillText(`RESULT · ${resultLabel}`, 56, 400);
    if (meta.verifyProof) {
      ctx.fillText(`VERIFY · ${meta.verifyProof}`, 56, 435);
    }

    if (meta.archetype) {
      ctx.fillStyle = "#E8B23A";
      ctx.fillText(`VS ${meta.archetype.toUpperCase()}`, 56, 475);
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

  return canvas;
}

export async function generateShareCard(
  result: DuelResult,
  meta: ShareCardMeta,
): Promise<void> {
  const canvas = await renderShareCardCanvas(result, meta);
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

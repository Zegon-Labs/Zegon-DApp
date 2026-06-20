import type { DuelResult } from "@zegon/game-core";

export async function generateShareCard(
  result: DuelResult,
  meta: { archetype?: string; brainMode?: string },
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0A0911";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#E6E1D3";
  ctx.font = "bold 72px monospace";
  ctx.fillText("ZEGON", 60, 100);

  ctx.font = "36px monospace";
  ctx.fillStyle = "#2EE6D6";
  ctx.fillText(`Score ${result.score}`, 60, 200);
  ctx.fillStyle = "#9A93A8";
  ctx.fillText(`Times read: ${result.timesRead}`, 60, 260);
  ctx.fillText(`Rounds: ${result.roundsPlayed}`, 60, 310);

  if (meta.archetype) {
    ctx.fillStyle = "#E8B23A";
    ctx.fillText(`vs ${meta.archetype}`, 60, 370);
  }

  ctx.fillStyle = meta.brainMode === "tee" ? "#4DF07A" : "#FF4D2E";
  ctx.fillText(meta.brainMode === "tee" ? "0G TEE Verified AI" : "Practice mode", 60, 430);

  ctx.fillStyle = "#3A3550";
  ctx.font = "24px monospace";
  ctx.fillText("Outdraw the blind · zegon-dapp.vercel.app", 60, 580);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `zegon-${result.score}.png`;
  a.click();
}

export function buildChallengeUrlFromResult(
  seed: string,
  archetype?: string,
): string {
  const base = window.location.origin;
  const params = new URLSearchParams();
  params.set("challenge", btoa(JSON.stringify({ seed, archetype, mode: "standard" })));
  return `${base}/?${params.toString()}`;
}

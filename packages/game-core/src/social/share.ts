export interface ShareTweetOptions {
  score: number;
  verifyRounds?: string;
  includeTag?: boolean;
}

const DEFAULT_TAG = "@Zegon_0g";

export function buildShareTweetText(options: ShareTweetOptions): string {
  const { score, verifyRounds, includeTag = true } = options;
  const lines = [
    `I just scored ${score} in ZEGON, a blindfolded AI duel powered by 0G.`,
    "ZEGON committed before I moved, and the proof is verifiable on-chain.",
  ];
  if (verifyRounds) {
    lines.push(`VERIFY: ${verifyRounds} rounds sealed first.`);
  }
  lines.push("Can you outdraw me?");
  if (includeTag) {
    lines.push("", DEFAULT_TAG);
  }
  return lines.join("\n");
}

export function buildTwitterIntentUrl(text: string, url?: string): string {
  const params = new URLSearchParams({ text });
  if (url) {
    params.set("url", url);
  }
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export const ZEGON_X_HANDLE = DEFAULT_TAG;

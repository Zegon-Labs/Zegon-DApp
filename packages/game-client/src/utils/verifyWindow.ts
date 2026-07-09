import { openExternalTab } from "./externalLink.js";

const VERIFY_WINDOW_NAME = "zegon-verify";

let lastOpenAt = 0;
let lastOpenedUrl = "";

function verifyPageUrl(duelId: string): string {
  const url = new URL("/verify.html", window.location.origin);
  url.searchParams.set("duel", duelId);
  return url.toString();
}

/** Opens or reuses a single VERIFY tab. Returns false if the browser blocked the tab. */
export function openVerifyDuelWindow(duelId: string): boolean {
  const url = verifyPageUrl(duelId);
  const now = Date.now();

  if (now - lastOpenAt < 900 && lastOpenedUrl === url) {
    return openExternalTab(url, VERIFY_WINDOW_NAME, "noopener,noreferrer");
  }

  lastOpenAt = now;
  lastOpenedUrl = url;
  return openExternalTab(url, VERIFY_WINDOW_NAME, "noopener,noreferrer");
}

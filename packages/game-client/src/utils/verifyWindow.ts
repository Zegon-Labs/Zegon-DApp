const VERIFY_WINDOW_NAME = "zegon-verify";
const OPEN_COOLDOWN_MS = 900;

let verifyWindow: Window | null = null;
let lastOpenAt = 0;

/** Opens or reuses a single VERIFY tab — debounced to prevent duplicate tabs per click. */
export function openVerifyDuelWindow(duelId: string): void {
  const now = Date.now();
  if (now - lastOpenAt < OPEN_COOLDOWN_MS) return;
  lastOpenAt = now;

  const url = `/verify.html?duel=${encodeURIComponent(duelId)}`;

  try {
    if (verifyWindow?.closed) verifyWindow = null;
  } catch {
    verifyWindow = null;
  }

  try {
    if (verifyWindow) {
      verifyWindow.location.href = url;
      verifyWindow.focus();
      return;
    }
  } catch {
    verifyWindow = null;
  }

  verifyWindow = window.open(url, VERIFY_WINDOW_NAME);
  verifyWindow?.focus();
}

import { getWalletAddress } from "./wallet.js";

export type MetricEvent =
  | "page_view"
  | "connect_wallet"
  | "daily_start"
  | "stake_click"
  | "stake_success"
  | "share_x"
  | "duel_finished";

const VISITOR_KEY = "zegon-visitor-id";

function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id =
      crypto.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export function trackMetric(event: MetricEvent): void {
  const payload = JSON.stringify({
    event,
    visitorId: getVisitorId(),
    wallet: getWalletAddress() ?? undefined,
  });

  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(
      "/api/metrics/track",
      new Blob([payload], { type: "application/json" }),
    );
    if (ok) return;
  }

  void fetch("/api/metrics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

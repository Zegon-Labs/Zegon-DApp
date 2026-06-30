import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataRoot } from "../utils/paths.js";

export type MetricEvent =
  | "page_view"
  | "connect_wallet"
  | "daily_start"
  | "stake_click"
  | "stake_success"
  | "share_x"
  | "duel_finished";

interface MetricsBucket {
  date: string;
  totals: Record<MetricEvent, number>;
  visitors: Record<string, number>;
  wallets: Record<string, number>;
  updatedAt: number;
}

const EVENTS: MetricEvent[] = [
  "page_view",
  "connect_wallet",
  "daily_start",
  "stake_click",
  "stake_success",
  "share_x",
  "duel_finished",
];

const DIR = join(dataRoot(), ".metrics");

function emptyBucket(date = todayUtc()): MetricsBucket {
  return {
    date,
    totals: Object.fromEntries(EVENTS.map((event) => [event, 0])) as Record<
      MetricEvent,
      number
    >,
    visitors: {},
    wallets: {},
    updatedAt: Date.now(),
  };
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function bucketPath(date: string): string {
  return join(DIR, `${date}.json`);
}

function isMetricEvent(value: unknown): value is MetricEvent {
  return typeof value === "string" && EVENTS.includes(value as MetricEvent);
}

async function loadBucket(date = todayUtc()): Promise<MetricsBucket> {
  try {
    const raw = await readFile(bucketPath(date), "utf-8");
    const parsed = JSON.parse(raw) as Partial<MetricsBucket>;
    return {
      ...emptyBucket(date),
      ...parsed,
      totals: { ...emptyBucket(date).totals, ...(parsed.totals ?? {}) },
      visitors: parsed.visitors ?? {},
      wallets: parsed.wallets ?? {},
      date,
    };
  } catch {
    return emptyBucket(date);
  }
}

async function saveBucket(bucket: MetricsBucket): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(bucketPath(bucket.date), JSON.stringify(bucket, null, 2));
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}

export async function trackMetric(body: {
  event?: unknown;
  visitorId?: unknown;
  wallet?: unknown;
}): Promise<{ ok: boolean; date: string }> {
  const date = todayUtc();
  if (!isMetricEvent(body.event)) {
    return { ok: false, date };
  }

  const bucket = await loadBucket(date);
  bucket.totals[body.event] = (bucket.totals[body.event] ?? 0) + 1;
  bucket.updatedAt = Date.now();

  const visitorId = normalizeId(body.visitorId);
  if (visitorId) {
    bucket.visitors[visitorId] = Date.now();
  }

  const wallet = normalizeId(body.wallet)?.toLowerCase();
  if (wallet) {
    bucket.wallets[wallet] = Date.now();
  }

  await saveBucket(bucket);
  return { ok: true, date };
}

export async function getMetricsSummary(date = todayUtc()): Promise<{
  date: string;
  totals: Record<MetricEvent, number>;
  uniqueVisitors: number;
  uniqueWallets: number;
  updatedAt: number;
}> {
  const bucket = await loadBucket(date);
  return {
    date,
    totals: bucket.totals,
    uniqueVisitors: Object.keys(bucket.visitors).length,
    uniqueWallets: Object.keys(bucket.wallets).length,
    updatedAt: bucket.updatedAt,
  };
}

function buildReportText(summary: Awaited<ReturnType<typeof getMetricsSummary>>): string {
  const lines = [
    `ZEGON Metrics · ${summary.date}`,
    "",
    `Visitors: ${summary.uniqueVisitors}`,
    `Wallets: ${summary.uniqueWallets}`,
    "",
    `Page views: ${summary.totals.page_view}`,
    `Wallet connects: ${summary.totals.connect_wallet}`,
    `Daily starts: ${summary.totals.daily_start}`,
    `Stake clicks: ${summary.totals.stake_click}`,
    `Stake successes: ${summary.totals.stake_success}`,
    `X shares: ${summary.totals.share_x}`,
    `Duels finished: ${summary.totals.duel_finished}`,
    "",
    `Updated: ${new Date(summary.updatedAt).toISOString()}`,
  ];
  return lines.join("\n");
}

export async function sendMetricsReport(date?: string): Promise<{
  ok: boolean;
  reason?: string;
  summary: Awaited<ReturnType<typeof getMetricsSummary>>;
}> {
  const summary = await getMetricsSummary(date);
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.METRICS_REPORT_TO;
  const from = process.env.METRICS_REPORT_FROM ?? "ZEGON <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return { ok: false, reason: "RESEND_NOT_CONFIGURED", summary };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `ZEGON metrics · ${summary.date}`,
      text: buildReportText(summary),
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      reason: await res.text().catch(() => `RESEND_${res.status}`),
      summary,
    };
  }

  return { ok: true, summary };
}

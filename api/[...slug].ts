import type { VercelRequest, VercelResponse } from "@vercel/node";

type Handlers = typeof import("../packages/game-server/dist/handlers/duelHandlers.js");

let handlersPromise: Promise<Handlers> | null = null;

function loadHandlers(): Promise<Handlers> {
  if (!handlersPromise) {
    handlersPromise = import("../packages/game-server/dist/handlers/duelHandlers.js");
  }
  return handlersPromise;
}

function slugParts(req: VercelRequest): string[] {
  const raw = req.query.slug;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.length > 0) return raw.split("/");
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const slug = slugParts(req);

  try {
    const h = await loadHandlers();

    if (slug[0] === "health" && req.method === "GET") {
      return res.status(200).json(await h.handleHealth());
    }
    if (slug[0] === "duel" && slug[1] === "start" && req.method === "POST") {
      return res.status(200).json(await h.handleStartDuel(req.body));
    }
    if (
      slug[0] === "duel" &&
      slug[1] === "round" &&
      slug[2] === "commit" &&
      req.method === "POST"
    ) {
      return res.status(200).json(await h.handleRoundCommit(req.body));
    }
    if (
      slug[0] === "duel" &&
      slug[1] === "round" &&
      slug[2] === "reveal" &&
      req.method === "POST"
    ) {
      return res.status(200).json(await h.handleRoundReveal(req.body));
    }
    if (slug[0] === "duel" && slug[1] === "record" && req.method === "POST") {
      return res.status(200).json(await h.handleRecordDuel(req.body));
    }
    if (slug[0] === "duel" && slug[1] === "verify" && req.method === "GET") {
      const duelId = slug[2] ?? "demo";
      const token =
        typeof req.query.token === "string" ? req.query.token : undefined;
      return res.status(200).json(await h.handleVerify(duelId, token));
    }
    if (slug[0] === "daily" && slug[1] === "pool") {
      const seed = String(req.query.seed ?? "");
      return res.status(200).json(await h.handleDailyPoolInfo(seed || undefined));
    }
    if (slug[0] === "daily" && slug[1] === "enter-check" && req.method === "POST") {
      return res.status(200).json(await h.handleDailyEnterCheck(req.body));
    }
    if (slug[0] === "daily" && slug[1] === "claim" && req.method === "POST") {
      return res.status(200).json(await h.handleDailyClaim(req.body));
    }
    if (slug[0] === "daily" && slug[1] === "leaderboard") {
      return res.status(200).json(await h.handleDailyLeaderboard());
    }
    if (slug[0] === "daily" && slug[1] === "submit" && req.method === "POST") {
      return res.status(200).json(await h.handleSubmitScore(req.body));
    }
    if (slug[0] === "global" && slug[1] === "leaderboard" && req.method === "GET") {
      const address = typeof req.query.address === "string" ? req.query.address : undefined;
      const board = typeof req.query.board === "string" ? req.query.board : undefined;
      return res.status(200).json(await h.handleGlobalLeaderboard({ board, address }));
    }
    if (slug[0] === "global" && slug[1] === "submit" && req.method === "POST") {
      return res.status(200).json(await h.handleGlobalSubmit(req.body));
    }
    if (slug[0] === "season" && slug[1] === "claim" && req.method === "POST") {
      return res.status(200).json(await h.handleSeasonClaim(req.body));
    }
    if (slug[0] === "auth" && slug[1] === "nonce" && req.method === "GET") {
      const address = String(req.query.address ?? "");
      return res.status(200).json(await h.handleAuthNonce(address));
    }
    if (slug[0] === "player" && slug[1] === "upgrade" && req.method === "POST") {
      return res.status(200).json(await h.handlePurchaseUpgrade(req.body));
    }
    if (slug[0] === "player" && slug[1] === "relic" && req.method === "POST") {
      return res.status(200).json(await h.handlePurchaseRelic(req.body));
    }
    if (slug[0] === "player" && slug[1] === "equip-consumable" && req.method === "POST") {
      return res.status(200).json(await h.handleEquipConsumable(req.body));
    }
    if (slug[0] === "player" && slug[1] === "consume-equipped" && req.method === "POST") {
      return res.status(200).json(await h.handleConsumeEquippedConsumable(req.body));
    }
    if (slug[0] === "duel" && slug[2] === "replay" && req.method === "GET") {
      const duelId = slug[1] ?? "";
      const token = typeof req.query.token === "string" ? req.query.token : undefined;
      return res.status(200).json(await h.handleDuelReplay(duelId, token));
    }
    if (slug[0] === "challenge" && slug[1] === "create" && req.method === "POST") {
      return res.status(200).json(await h.handleCreateChallengeLink(req.body));
    }
    if (slug[0] === "challenge" && slug[1] && req.method === "GET") {
      return res.status(200).json(await h.handleGetChallengeLink(slug[1]));
    }
    if (slug[0] === "metrics" && slug[1] === "track" && req.method === "POST") {
      return res.status(200).json(await h.handleTrackMetric(req.body));
    }
    if (slug[0] === "metrics" && slug[1] === "summary" && req.method === "GET") {
      const date = typeof req.query.date === "string" ? req.query.date : undefined;
      return res.status(200).json(await h.handleMetricsSummary(date));
    }
    if (
      slug[0] === "metrics" &&
      slug[1] === "report" &&
      (req.method === "POST" || req.method === "GET")
    ) {
      const cronSecret = process.env.CRON_SECRET;
      if (
        cronSecret &&
        req.headers.authorization !== `Bearer ${cronSecret}`
      ) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const date = typeof req.query.date === "string" ? req.query.date : undefined;
      return res.status(200).json(await h.handleMetricsReport(date));
    }
    if (slug[0] === "player" && slug[1] === "profile" && slug[2] === "stats" && req.method === "POST") {
      const result = await h.handleUpdateProfileStats(req.body);
      if ("accepted" in result && !result.accepted) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    }
    if (slug[0] === "player" && slug[1] === "profile" && req.method === "GET") {
      const address = typeof req.query.address === "string" ? req.query.address : undefined;
      const nickname = typeof req.query.nickname === "string" ? req.query.nickname : undefined;
      if (slug[2] === "public" || nickname) {
        return res.status(200).json(await h.handleGetPublicProfile({ address, nickname }));
      }
      return res.status(200).json(await h.handleGetPlayerProfile(String(address ?? slug[2] ?? "")));
    }
    if (slug[0] === "player" && slug[1] === "profile" && req.method === "POST") {
      return res.status(200).json(await h.handleSetPlayerProfile(req.body));
    }

    return res.status(404).json({ error: "Not found", slug });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}

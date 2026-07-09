import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createServer } from "node:http";

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });
import {
  handleDailyLeaderboard,
  handleGlobalLeaderboard,
  handleGlobalSubmit,
  handleRecordDuel,
  handleRoundCommit,
  handleRoundReveal,
  handleStartDuel,
  handleSubmitScore,
  handleVerify,
  handleGetPlayerProfile,
  handleSetPlayerProfile,
  handleUpdateProfileStats,
  handleDailyPoolInfo,
  handleDailyClaim,
  handleDailyEnterCheck,
  handleCreateChallengeLink,
  handleGetChallengeLink,
  handleAuthNonce,
  handlePurchaseUpgrade,
  handlePurchaseRelic,
  handleEquipConsumable,
  handleConsumeEquippedConsumable,
  handleDuelReplay,
  handleSeasonClaim,
  handleGunslingerEvaluate,
  handleGunslingerPreference,
  handleGunslingerMint,
  handleGunslingerMetadata,
} from "./handlers/duelHandlers.js";
import { handleHealth } from "./handlers/healthHandler.js";

const PORT = Number(process.env.PORT ?? 3000);

async function parseBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? "/";

  try {
    if (url === "/api/health" && req.method === "GET") {
      const result = await handleHealth();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/daily/pool") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const seed = parsed.searchParams.get("seed") ?? undefined;
      const result = await handleDailyPoolInfo(seed);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/daily/enter-check" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleDailyEnterCheck>[0];
      const result = await handleDailyEnterCheck(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/daily/claim" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleDailyClaim>[0];
      const result = await handleDailyClaim(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/profile/stats" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleUpdateProfileStats>[0];
      const result = await handleUpdateProfileStats(body);
      const status = "accepted" in result && !result.accepted ? 400 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/duel/start" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleStartDuel>[0];
      const result = await handleStartDuel(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/duel/round/commit" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleRoundCommit>[0];
      const result = await handleRoundCommit(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/duel/round/reveal" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleRoundReveal>[0];
      const result = await handleRoundReveal(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/duel/record" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleRecordDuel>[0];
      const result = await handleRecordDuel(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/duel/verify/") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const duelId = parsed.pathname.split("/").pop() ?? "demo";
      const token = parsed.searchParams.get("token") ?? undefined;
      const result = await handleVerify(duelId, token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    const replayMatch = url.match(/^\/api\/duel\/([^/?]+)\/replay/);
    if (replayMatch && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const token = parsed.searchParams.get("token") ?? undefined;
      const result = await handleDuelReplay(replayMatch[1]!, token);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/auth/nonce") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const address = parsed.searchParams.get("address") ?? "";
      const result = await handleAuthNonce(address);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/upgrade" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handlePurchaseUpgrade>[0];
      const result = await handlePurchaseUpgrade(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/relic" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handlePurchaseRelic>[0];
      const result = await handlePurchaseRelic(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/equip-consumable" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleEquipConsumable>[0];
      const result = await handleEquipConsumable(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/consume-equipped" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleConsumeEquippedConsumable>[0];
      const result = await handleConsumeEquippedConsumable(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/season/claim" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleSeasonClaim>[0];
      const result = await handleSeasonClaim(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/daily/leaderboard" && req.method === "GET") {
      const result = await handleDailyLeaderboard();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/global/leaderboard") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const board = parsed.searchParams.get("board") ?? undefined;
      const address = parsed.searchParams.get("address") ?? undefined;
      const result = await handleGlobalLeaderboard({ board: board ?? undefined, address: address ?? undefined });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/global/submit" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleGlobalSubmit>[0];
      const result = await handleGlobalSubmit(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/challenge/create" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleCreateChallengeLink>[0];
      const result = await handleCreateChallengeLink(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/challenge/") && req.method === "GET") {
      const id = url.split("/").pop() ?? "";
      const result = await handleGetChallengeLink(id);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/metrics/track" && req.method === "POST") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url === "/api/daily/submit" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleSubmitScore>[0];
      const result = await handleSubmitScore(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/player/profile") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const address = parsed.searchParams.get("address") ?? "";
      const result = await handleGetPlayerProfile(address);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/profile" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleSetPlayerProfile>[0];
      const result = await handleSetPlayerProfile(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/gunslinger/evaluate" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleGunslingerEvaluate>[0];
      const result = await handleGunslingerEvaluate(body);
      const status = "accepted" in result && !result.accepted ? 400 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/gunslinger/preference" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleGunslingerPreference>[0];
      const result = await handleGunslingerPreference(body);
      const status = "accepted" in result && !result.accepted ? 400 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url === "/api/player/gunslinger/mint" && req.method === "POST") {
      const body = (await parseBody(req)) as Parameters<typeof handleGunslingerMint>[0];
      const result = await handleGunslingerMint(body);
      const status = "accepted" in result && !result.accepted ? 400 : 200;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (url.startsWith("/api/player/gunslinger/metadata") && req.method === "GET") {
      const parsed = new URL(url, "http://localhost");
      const address = parsed.searchParams.get("address") ?? "";
      const result = await handleGunslingerMetadata(address);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`ZEGON API dev server on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or run with PORT=3001 pnpm dev`,
    );
    process.exit(1);
  }
  throw err;
});

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleDailyLeaderboard,
  handleRecordDuel,
  handleRoundCommit,
  handleRoundReveal,
  handleStartDuel,
  handleSubmitScore,
  handleVerify,
} from "../packages/game-server/src/handlers/duelHandlers.js";

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
    // /api/duel/start
    if (slug[0] === "duel" && slug[1] === "start" && req.method === "POST") {
      return res.status(200).json(await handleStartDuel(req.body));
    }
    // /api/duel/round/commit
    if (
      slug[0] === "duel" &&
      slug[1] === "round" &&
      slug[2] === "commit" &&
      req.method === "POST"
    ) {
      return res.status(200).json(await handleRoundCommit(req.body));
    }
    // /api/duel/round/reveal
    if (
      slug[0] === "duel" &&
      slug[1] === "round" &&
      slug[2] === "reveal" &&
      req.method === "POST"
    ) {
      return res.status(200).json(await handleRoundReveal(req.body));
    }
    // /api/duel/record
    if (slug[0] === "duel" && slug[1] === "record" && req.method === "POST") {
      return res.status(200).json(await handleRecordDuel(req.body));
    }
    // /api/duel/verify/:id
    if (slug[0] === "duel" && slug[1] === "verify" && req.method === "GET") {
      const duelId = slug[2] ?? "demo";
      return res.status(200).json(await handleVerify(duelId));
    }
    // /api/daily/leaderboard
    if (slug[0] === "daily" && slug[1] === "leaderboard") {
      return res.status(200).json(await handleDailyLeaderboard());
    }
    // /api/daily/submit
    if (slug[0] === "daily" && slug[1] === "submit" && req.method === "POST") {
      return res.status(200).json(await handleSubmitScore(req.body));
    }

    return res.status(404).json({ error: "Not found", slug });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

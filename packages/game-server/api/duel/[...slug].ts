import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleDailyLeaderboard,
  handleRecordDuel,
  handleRoundCommit,
  handleRoundReveal,
  handleStartDuel,
  handleSubmitScore,
  handleVerify,
} from "../../src/handlers/duelHandlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { slug } = req.query;

  try {
    if (slug?.[0] === "start" && req.method === "POST") {
      return res.status(200).json(await handleStartDuel(req.body));
    }
    if (slug?.[0] === "round" && slug?.[1] === "commit" && req.method === "POST") {
      return res.status(200).json(await handleRoundCommit(req.body));
    }
    if (slug?.[0] === "round" && slug?.[1] === "reveal" && req.method === "POST") {
      return res.status(200).json(await handleRoundReveal(req.body));
    }
    if (slug?.[0] === "record" && req.method === "POST") {
      return res.status(200).json(await handleRecordDuel(req.body));
    }
    if (slug?.[0] === "verify" && req.method === "GET") {
      const duelId = slug[1] ?? "demo";
      return res.status(200).json(await handleVerify(duelId));
    }
    if (slug?.[0] === "daily" && slug?.[1] === "leaderboard") {
      return res.status(200).json(await handleDailyLeaderboard());
    }
    if (slug?.[0] === "daily" && slug?.[1] === "submit" && req.method === "POST") {
      return res.status(200).json(await handleSubmitScore(req.body));
    }
    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

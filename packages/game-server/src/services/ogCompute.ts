import {
  DummyZegonBrain,
  PlayerAction,
  RoundContext,
  ZegonAction,
  ZegonDecision,
  ALL_PLAYER_ACTIONS,
  ALL_ZEGON_ACTIONS,
} from "@zegon/game-core";
import { createHash } from "node:crypto";

const SYSTEM_PROMPT = `You are ZEGON, a blind gunslinger AI. You CANNOT see the opponent's current move.
You receive ONLY their action history. Predict their NEXT action from patterns and choose your counter-move.
Return ONLY JSON: {"predicted_player_move","zegon_move","confidence","taunt"}`;

function buildUserPrompt(ctx: RoundContext): string {
  return JSON.stringify({
    history: ctx.playerHistory,
    state: {
      hp_player: ctx.playerHp,
      hp_zegon: ctx.zegonHp,
      weapon: ctx.weapon,
      ammo: ctx.ammo,
      round: ctx.roundIndex,
      blindsight: ctx.blindsight,
    },
  });
}

function parseDecision(raw: string): ZegonDecision | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const predicted = json.predicted_player_move as PlayerAction;
    const move = json.zegon_move as ZegonAction;
    if (!ALL_PLAYER_ACTIONS.includes(predicted)) return null;
    if (!ALL_ZEGON_ACTIONS.includes(move)) return null;
    return {
      predictedPlayerMove: predicted,
      zegonMove: move,
      confidence: Number(json.confidence) || 0.5,
      taunt: String(json.taunt || "The blind sees patterns."),
    };
  } catch {
    return null;
  }
}

export class OGComputeService {
  async infer(ctx: RoundContext): Promise<{
    decision: ZegonDecision;
    attestationHash: string;
  }> {
    const userPrompt = buildUserPrompt(ctx);

    try {
      const { createZGComputeNetworkBroker } = await import(
        "@0glabs/0g-serving-broker"
      );
      const { ethers } = await import("ethers");

      const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
      if (!pk) throw new Error("No wallet configured");

      const provider = new ethers.JsonRpcProvider(
        process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
      );
      const signer = new ethers.Wallet(pk, provider);
      const broker = await createZGComputeNetworkBroker(signer);

      const model = process.env.OG_MODEL ?? "glm-5-fp8";
      const headers = await broker.inference.getRequestHeaders(model);
      const metadata = await broker.inference.getServiceMetadata(model);

      const response = await fetch(metadata.endpoint, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
        }),
      });

      const body = await response.text();
      const verified = await broker.inference.processResponse(
        model,
        response.headers as Record<string, string>,
        body,
      );

      const decision =
        parseDecision(body) ??
        (await new DummyZegonBrain().decide(ctx));

      const attestationHash = createHash("sha256")
        .update(JSON.stringify(verified))
        .digest("hex");

      return { decision, attestationHash };
    } catch {
      const decision = await new DummyZegonBrain().decide(ctx);
      const attestationHash = createHash("sha256")
        .update(userPrompt)
        .digest("hex");
      return { decision, attestationHash };
    }
  }
}

let instance: OGComputeService | null = null;

export function getOGComputeService(): OGComputeService {
  if (!instance) {
    instance = new OGComputeService();
  }
  return instance;
}

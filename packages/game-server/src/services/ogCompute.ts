import {
  DummyZegonBrain,
  RoundContext,
  ZegonDecision,
  ALL_PLAYER_ACTIONS,
  createRoundRng,
  normalizePlayerAction,
  pickZegonMove,
  analyzePlayerPattern,
  patternHintsForTee,
} from "@zegon/game-core";
import { createHash } from "node:crypto";

const SYSTEM_PROMPT = `You are ZEGON, a blind gunslinger AI. You CANNOT see the opponent's current move.
You receive their action history AND pattern_hints from a local analyzer (frequency, Markov, alternation, item bias).
Use pattern_hints as strong signals but do not ignore round-to-round variation — players break patterns deliberately.
Return ONLY JSON: {"predicted_player_move":"FIRE"|"DODGE"|"USE_ITEM","confidence":0.0-1.0,"taunt":"..."}
Use uppercase action names. Do not include zegon_move — the server picks your counter-move.
With empty history, vary your opening prediction — do not always choose FIRE.`;

function buildUserPrompt(ctx: RoundContext): string {
  const rng = createRoundRng(undefined, ctx);
  const analysis = analyzePlayerPattern(ctx, rng);
  return JSON.stringify({
    history: ctx.playerHistory,
    pattern_hints: patternHintsForTee(analysis, ctx.roundIndex),
    state: {
      hp_player: ctx.playerHp,
      hp_zegon: ctx.zegonHp,
      weapon: ctx.weapon,
      ammo: ctx.ammo,
      round: ctx.roundIndex,
      blindsight: ctx.blindsight,
      archetype: ctx.archetype,
      times_read_so_far: ctx.timesReadSoFar,
    },
  });
}

function parseDecision(raw: string, ctx: RoundContext, rngSeed?: string): ZegonDecision | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const json = JSON.parse(jsonMatch?.[0] ?? raw) as Record<string, unknown>;
    const predicted =
      normalizePlayerAction(json.predicted_player_move) ??
      normalizePlayerAction(json.predictedPlayerMove);
    if (!predicted || !ALL_PLAYER_ACTIONS.includes(predicted)) return null;

    const rng = createRoundRng(rngSeed, ctx);
    const confidence = Number(json.confidence) || 0.5;
    const zegonMove = pickZegonMove(predicted, ctx, rng, confidence);

    return {
      predictedPlayerMove: predicted,
      zegonMove,
      confidence: Number(json.confidence) || 0.5,
      taunt: String(json.taunt || "The blind sees patterns."),
    };
  } catch {
    return null;
  }
}

function extractAssistantContent(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (content) return content;
  } catch {
    // raw text fallback
  }
  return body;
}

let ledgerInitialized = false;

async function ensureLedgerFunded(broker: {
  ledger: {
    depositFund?: (amount: number) => Promise<unknown>;
    addLedger?: (amount: number) => Promise<unknown>;
  };
}): Promise<void> {
  if (ledgerInitialized) return;
  const depositOg = Number(process.env.OG_LEDGER_DEPOSIT_OG ?? "3");
  try {
    if (typeof broker.ledger.depositFund === "function") {
      await broker.ledger.depositFund(depositOg);
    } else if (typeof broker.ledger.addLedger === "function") {
      await broker.ledger.addLedger(depositOg);
    }
  } catch {
    // Ledger may already exist with balance
  }
  ledgerInitialized = true;
}

async function resolveProviderAddress(
  broker: {
    inference: {
      listService: () => Promise<Array<{ provider: string; model?: string; url?: string }>>;
    };
  },
  modelFilter: string,
): Promise<string> {
  const services = await broker.inference.listService();
  if (services.length === 0) {
    throw new Error("No 0G Compute services available");
  }

  const match = services.find(
    (s) =>
      s.model?.includes(modelFilter) ||
      s.url?.includes(modelFilter) ||
      JSON.stringify(s).includes(modelFilter),
  );

  return (match ?? services[0]).provider;
}

export class OGComputeService {
  async infer(
    ctx: RoundContext,
    rngSeed?: string,
  ): Promise<{
    decision: ZegonDecision;
    attestationHash: string;
    attestation?: unknown;
  }> {
    const userPrompt = buildUserPrompt(ctx);
    const useOG = process.env.USE_OG_COMPUTE === "true";
    const strict = useOG;

    try {
      const { createZGComputeNetworkBroker } = await import(
        "@0gfoundation/0g-compute-ts-sdk"
      );
      const { ethers } = await import("ethers");

      const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
      if (!pk) throw new Error("SERVER_WALLET_PRIVATE_KEY not configured");

      const provider = new ethers.JsonRpcProvider(
        process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
      );
      const signer = new ethers.Wallet(pk, provider);
      const broker = await createZGComputeNetworkBroker(
        signer as unknown as Parameters<typeof createZGComputeNetworkBroker>[0],
      );

      await ensureLedgerFunded(broker);

      const modelFilter = process.env.OG_MODEL ?? "glm-5-fp8";
      const providerAddress = await resolveProviderAddress(broker, modelFilter);

      try {
        await broker.inference.acknowledgeProviderSigner(providerAddress);
      } catch {
        // Provider may already be acknowledged
      }

      const metadata = await broker.inference.getServiceMetadata(providerAddress);
      const temperature = ctx.playerHistory.length === 0 ? 0.55 : 0.25;
      const requestBody = JSON.stringify({
        model: metadata.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature,
      });

      const headers = await broker.inference.getRequestHeaders(
        providerAddress,
        requestBody,
      );

      const controller = new AbortController();
      const timeoutMs = Number(process.env.OG_INFER_TIMEOUT_MS ?? "15000");
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(metadata.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(headers as unknown as Record<string, string>),
          },
          body: requestBody,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const body = await response.text();
      if (!response.ok) {
        throw new Error(`Compute HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const attestationValid = await broker.inference.processResponse(
        providerAddress,
        body,
      );

      const assistantText = extractAssistantContent(body);
      const decision = parseDecision(
        assistantText,
        ctx,
        rngSeed ?? process.env.OG_MODEL ?? "glm-5-fp8",
      );
      if (!decision) {
        throw new Error("Invalid TEE response JSON");
      }

      const attestation = { valid: attestationValid, body: assistantText };
      const attestationHash = createHash("sha256")
        .update(JSON.stringify(attestation))
        .digest("hex");

      return { decision, attestationHash, attestation };
    } catch (err) {
      if (strict) {
        throw err instanceof Error ? err : new Error(String(err));
      }
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

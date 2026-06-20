import {
  DummyZegonBrain,
  PlayerAction,
  RoundContext,
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const json = JSON.parse(jsonMatch?.[0] ?? raw) as Record<string, unknown>;
    const predicted = json.predicted_player_move as PlayerAction;
    const move = json.zegon_move as ZegonDecision["zegonMove"];
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
  async infer(ctx: RoundContext): Promise<{
    decision: ZegonDecision;
    attestationHash: string;
    attestation?: unknown;
  }> {
    const userPrompt = buildUserPrompt(ctx);
    const useOG = process.env.USE_OG_COMPUTE === "true";
    const strict = useOG;

    try {
      const { createZGComputeNetworkBroker } = await import(
        "@0glabs/0g-serving-broker"
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
      const metadata = await broker.inference.getServiceMetadata(providerAddress);
      const requestBody = JSON.stringify({
        model: metadata.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
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
            Address: headers.Address,
            "VLLM-Proxy": headers["VLLM-Proxy"],
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
      const decision = parseDecision(assistantText);
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

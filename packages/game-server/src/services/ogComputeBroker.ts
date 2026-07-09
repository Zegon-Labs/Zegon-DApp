import { createHash } from "node:crypto";

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
    // Ledger may already exist
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

export interface OGTextInferenceResult {
  text: string;
  attestationHash: string;
}

/** Shared 0G Compute text inference (system + user prompts). */
export async function runOGTextInference(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number },
): Promise<OGTextInferenceResult> {
  const { createZGComputeNetworkBroker } = await import("@0gfoundation/0g-compute-ts-sdk");
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
    // already acknowledged
  }

  const metadata = await broker.inference.getServiceMetadata(providerAddress);
  const requestBody = JSON.stringify({
    model: metadata.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options?.temperature ?? 0.35,
  });

  const headers = await broker.inference.getRequestHeaders(providerAddress, requestBody);

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OG_INFER_TIMEOUT_MS ?? "20000");
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

  const attestationValid = await broker.inference.processResponse(providerAddress, body);
  const text = extractAssistantContent(body);
  const attestationHash = createHash("sha256")
    .update(JSON.stringify({ valid: attestationValid, body: text }))
    .digest("hex");

  return { text, attestationHash };
}

export function parseJsonFromLLM<T>(raw: string): T | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? raw) as T;
  } catch {
    return null;
  }
}

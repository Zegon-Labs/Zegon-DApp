import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ethers } from "ethers";

const DATA_DIR = process.env.DUEL_LOG_DIR ?? join(process.cwd(), ".duel-logs");
const INDEXER_RPC =
  process.env.OG_STORAGE_INDEXER ??
  "https://indexer-storage-turbo.0g.ai";
const RPC_URL = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";

export interface StorageResult {
  rootHash?: string;
  txHash?: string;
  localPath?: string;
  indexerUrl?: string;
}

async function storeLocal(
  duelId: string,
  payload: unknown,
): Promise<string | undefined> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const path = join(DATA_DIR, `${duelId}.json`);
    await writeFile(path, JSON.stringify(payload, null, 2));
    return path;
  } catch {
    return undefined;
  }
}

export async function loadDuelLog(duelId: string): Promise<unknown[] | null> {
  const payload = await loadDuelLogPayload(duelId);
  return payload?.logs ?? null;
}

export async function loadDuelLogPayload(
  duelId: string,
): Promise<{ duelId: string; logs: unknown[]; storedAt?: number } | null> {
  try {
    const path = join(DATA_DIR, `${duelId}.json`);
    const data = await readFile(path, "utf-8");
    const parsed = JSON.parse(data) as
      | { duelId: string; logs: unknown[]; storedAt?: number }
      | unknown[];
    if (Array.isArray(parsed)) {
      return { duelId, logs: parsed };
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function storeDuelLog(
  duelId: string,
  logs: unknown[],
): Promise<StorageResult> {
  const payload = { duelId, logs, storedAt: Date.now() };
  const localPath = await storeLocal(duelId, payload);

  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!pk) {
    return { localPath };
  }

  try {
    const { Indexer, MemData } = await import("@0glabs/0g-ts-sdk");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(pk, provider);
    const indexer = new Indexer(INDEXER_RPC);

    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const file = new MemData(bytes);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr !== null) {
      throw treeErr;
    }

    const [tx, uploadErr] = await indexer.upload(
      file,
      RPC_URL,
      signer as never,
    );
    if (uploadErr !== null) {
      throw uploadErr;
    }

    const rootHash =
      typeof tx === "object" && tx !== null && "rootHash" in tx
        ? String(tx.rootHash)
        : tree?.rootHash?.() ?? undefined;
    const txHash =
      typeof tx === "object" && tx !== null && "txHash" in tx
        ? String(tx.txHash)
        : undefined;

    return {
      rootHash,
      txHash,
      localPath,
      indexerUrl: `${INDEXER_RPC}?rootHash=${rootHash ?? ""}`,
    };
  } catch {
    return { localPath };
  }
}

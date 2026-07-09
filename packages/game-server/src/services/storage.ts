import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ethers } from "ethers";
import { duelLogDir } from "../utils/paths.js";

const DATA_DIR = duelLogDir();
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

export function storageDownloadUrl(rootHash: string): string {
  return `${INDEXER_RPC}/download?root=${encodeURIComponent(rootHash)}`;
}

async function storeLocal(key: string, payload: unknown): Promise<string | undefined> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const path = join(DATA_DIR, `${key}.json`);
    const body =
      typeof payload === "string" || payload instanceof Uint8Array
        ? payload
        : JSON.stringify(payload, null, 2);
    await writeFile(path, body);
    return path;
  } catch {
    return undefined;
  }
}

async function uploadBytes(bytes: Uint8Array): Promise<StorageResult> {
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!pk) {
    return {};
  }

  try {
    const { Indexer, MemData } = await import("@0glabs/0g-ts-sdk");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(pk, provider);
    const indexer = new Indexer(INDEXER_RPC);

    const file = new MemData(bytes);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr !== null) {
      throw treeErr;
    }

    const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer as never);
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
      indexerUrl: rootHash ? storageDownloadUrl(rootHash) : undefined,
    };
  } catch {
    return {};
  }
}

export async function uploadJsonToStorage(
  key: string,
  payload: unknown,
): Promise<StorageResult> {
  const localPath = await storeLocal(key, payload);
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const uploaded = await uploadBytes(bytes);
  return { ...uploaded, localPath };
}

export async function uploadBytesToStorage(
  key: string,
  bytes: Uint8Array,
): Promise<StorageResult> {
  const localPath = await storeLocal(key, bytes);
  const uploaded = await uploadBytes(bytes);
  return { ...uploaded, localPath, indexerUrl: uploaded.indexerUrl };
}

export async function readPortraitBytes(relativePath: string): Promise<Uint8Array | null> {
  const candidates = [
    join(process.cwd(), "packages", "game-client", "public", relativePath),
    join(process.cwd(), "public", relativePath),
    join(process.cwd(), "packages", "game-client", "dist", relativePath),
  ];
  for (const path of candidates) {
    try {
      const buf = await readFile(path);
      return new Uint8Array(buf);
    } catch {
      // try next
    }
  }

  const publicBase =
    process.env.GUNSLINGER_PUBLIC_BASE_URL ??
    (process.env.SIWE_DOMAIN ? `https://${process.env.SIWE_DOMAIN}` : "https://www.zegonduel.com");
  const urlPath = relativePath.replace(/\\/g, "/");
  const segments = urlPath.split("/");
  const encoded = segments.map((s, i) => (i === 0 ? s : encodeURIComponent(s))).join("/");
  try {
    const res = await fetch(`${publicBase}/${encoded}`);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
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

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const uploaded = await uploadBytes(bytes);
  return { ...uploaded, localPath };
}

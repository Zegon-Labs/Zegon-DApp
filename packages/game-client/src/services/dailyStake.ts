import { createDailyDuel, getDailyArchetype, type ZegonArchetypeId } from "@zegon/game-core";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeFunctionData,
  http,
  keccak256,
  parseEther,
  toBytes,
} from "viem";

export const GALILEO_CHAIN = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: {
    default: { name: "Chainscan Galileo", url: "https://chainscan-galileo.0g.ai" },
  },
});

const POOL_ABI = [
  {
    type: "function",
    name: "enterDaily",
    stateMutability: "payable",
    inputs: [{ name: "daySeed", type: "bytes32" }],
    outputs: [],
  },
] as const;

export type DailyPoolRankReward = {
  rank: number;
  sharePercent: number;
  label: string;
  note?: string;
};

export type DailyPoolInfo = {
  seed: string;
  configured: boolean;
  poolAddress?: string;
  totalStaked?: string;
  entrants?: number;
  closed?: boolean;
  minStake?: string;
  rankRewards?: DailyPoolRankReward[];
};

export type DailyStakeErrorCode =
  | "NO_WALLET"
  | "WRONG_NETWORK"
  | "INSUFFICIENT_BALANCE"
  | "USER_REJECTED"
  | "ALREADY_ENTERED"
  | "POOL_CLOSED"
  | "POOL_NOT_CONFIGURED"
  | "TX_FAILED";

export class DailyStakeError extends Error {
  constructor(
    public readonly code: DailyStakeErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DailyStakeError";
  }
}

export function seedToBytes32(seed: string): `0x${string}` {
  return keccak256(toBytes(seed));
}

export async function fetchDailyPool(seed?: string): Promise<DailyPoolInfo> {
  const q = seed ? `?seed=${encodeURIComponent(seed)}` : "";
  const res = await fetch(`/api/daily/pool${q}`);
  if (!res.ok) throw new Error("Failed to fetch pool");
  return res.json() as Promise<DailyPoolInfo>;
}

export async function checkDailyEntered(
  seed: string,
  player: string,
): Promise<boolean> {
  const res = await fetch("/api/daily/enter-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed, player }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { entered: boolean };
  return data.entered;
}

async function getWalletChainId(): Promise<number | null> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum;
  if (!eth) return null;
  try {
    const id = await eth.request({ method: "eth_chainId" });
    return typeof id === "string" ? parseInt(id, 16) : Number(id);
  } catch {
    return null;
  }
}

export async function ensureGalileoNetwork(): Promise<void> {
  const eth = (window as unknown as {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }).ethereum;
  if (!eth) throw new DailyStakeError("NO_WALLET");

  const chainId = await getWalletChainId();
  if (chainId === GALILEO_CHAIN.id) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${GALILEO_CHAIN.id.toString(16)}` }],
    });
  } catch (switchErr: unknown) {
    const err = switchErr as { code?: number };
    if (err?.code === 4902) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${GALILEO_CHAIN.id.toString(16)}`,
              chainName: GALILEO_CHAIN.name,
              nativeCurrency: GALILEO_CHAIN.nativeCurrency,
              rpcUrls: GALILEO_CHAIN.rpcUrls.default.http,
              blockExplorerUrls: [GALILEO_CHAIN.blockExplorers.default.url],
            },
          ],
        });
        return;
      } catch {
        throw new DailyStakeError("WRONG_NETWORK");
      }
    }
    throw new DailyStakeError("WRONG_NETWORK");
  }
}

function parseStakeError(err: unknown): DailyStakeError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return new DailyStakeError("USER_REJECTED", msg);
  }
  if (lower.includes("already entered")) {
    return new DailyStakeError("ALREADY_ENTERED", msg);
  }
  if (lower.includes("pool closed") || lower.includes("closed")) {
    return new DailyStakeError("POOL_CLOSED", msg);
  }
  if (lower.includes("insufficient") || lower.includes("exceeds balance")) {
    return new DailyStakeError("INSUFFICIENT_BALANCE", msg);
  }
  return new DailyStakeError("TX_FAILED", msg);
}

export async function enterDailyPool(
  poolAddress: string,
  seed: string,
  valueEth: string,
): Promise<string> {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new DailyStakeError("NO_WALLET");

  await ensureGalileoNetwork();

  const walletClient = createWalletClient({
    chain: GALILEO_CHAIN,
    transport: custom(eth as Parameters<typeof custom>[0]),
  });
  const [account] = await walletClient.getAddresses();

  const publicClient = createPublicClient({
    chain: GALILEO_CHAIN,
    transport: http(GALILEO_CHAIN.rpcUrls.default.http[0]),
  });

  const valueWei = parseEther(valueEth);
  const balance = await publicClient.getBalance({ address: account });
  if (balance < valueWei) {
    throw new DailyStakeError("INSUFFICIENT_BALANCE");
  }

  const data = encodeFunctionData({
    abi: POOL_ABI,
    functionName: "enterDaily",
    args: [seedToBytes32(seed)],
  });

  try {
    const hash = await walletClient.sendTransaction({
      chain: GALILEO_CHAIN,
      account,
      to: poolAddress as `0x${string}`,
      value: valueWei,
      data,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (err) {
    if (err instanceof DailyStakeError) throw err;
    throw parseStakeError(err);
  }
}

export async function claimDailyReward(body: {
  seed: string;
  player: string;
  rank: number;
}): Promise<{ success: boolean; amount?: string; txHash?: string; reason?: string }> {
  const res = await fetch("/api/daily/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{
    success: boolean;
    amount?: string;
    txHash?: string;
    reason?: string;
  }>;
}

export function getTodayDailyMeta() {
  const config = createDailyDuel();
  const archetype = getDailyArchetype();
  return { config, archetype, seed: config.seed! };
}

export type { ZegonArchetypeId };

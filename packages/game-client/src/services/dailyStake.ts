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

const galileo = defineChain({
  id: 16602,
  name: "Galileo",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
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

export function seedToBytes32(seed: string): `0x${string}` {
  return keccak256(toBytes(seed));
}

export async function fetchDailyPool(seed?: string): Promise<{
  seed: string;
  configured: boolean;
  poolAddress?: string;
  totalStaked?: string;
  entrants?: number;
  closed?: boolean;
  minStake?: string;
}> {
  const q = seed ? `?seed=${encodeURIComponent(seed)}` : "";
  const res = await fetch(`/api/daily/pool${q}`);
  if (!res.ok) throw new Error("Failed to fetch pool");
  return res.json() as Promise<{
    seed: string;
    configured: boolean;
    poolAddress?: string;
    totalStaked?: string;
    entrants?: number;
    closed?: boolean;
    minStake?: string;
  }>;
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

export async function enterDailyPool(
  poolAddress: string,
  seed: string,
  valueEth: string,
): Promise<string> {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No wallet");

  const walletClient = createWalletClient({
    chain: galileo,
    transport: custom(eth as Parameters<typeof custom>[0]),
  });
  const [account] = await walletClient.getAddresses();
  const data = encodeFunctionData({
    abi: POOL_ABI,
    functionName: "enterDaily",
    args: [seedToBytes32(seed)],
  });

  const hash = await walletClient.sendTransaction({
    chain: galileo,
    account,
    to: poolAddress as `0x${string}`,
    value: parseEther(valueEth),
    data,
  });

  const publicClient = createPublicClient({
    chain: galileo,
    transport: http("https://evmrpc-testnet.0g.ai"),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
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

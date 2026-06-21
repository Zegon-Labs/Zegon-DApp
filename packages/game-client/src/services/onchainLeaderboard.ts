import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { getWalletAddress, hasEthereumProvider } from "./wallet.js";

const GALILEO_CHAIN = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
} as const;

const LEADERBOARD_ABI = [
  {
    type: "function",
    name: "submitScore",
    stateMutability: "nonpayable",
    inputs: [{ name: "score", type: "uint256" }, { name: "duelId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getScore",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getTopN",
    stateMutability: "view",
    inputs: [{ name: "n", type: "uint256" }],
    outputs: [
      { name: "addrs", type: "address[]" },
      { name: "scores", type: "uint256[]" },
    ],
  },
] as const;

export interface OnChainLeaderboardEntry {
  playerId: string;
  score: number;
}

function contractAddress(): Address | null {
  const raw = import.meta.env.VITE_LEADERBOARD_CONTRACT_ADDRESS as string | undefined;
  if (!raw) return null;
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

function publicClient() {
  return createPublicClient({
    chain: GALILEO_CHAIN,
    transport: http(GALILEO_CHAIN.rpcUrls.default.http[0]),
  });
}

export function isLeaderboardContractConfigured(): boolean {
  return contractAddress() != null;
}

export async function fetchOnChainLeaderboard(
  limit = 10,
): Promise<OnChainLeaderboardEntry[] | null> {
  const address = contractAddress();
  if (!address) return null;

  try {
    const client = publicClient();
    const [addrs, scores] = (await client.readContract({
      address,
      abi: LEADERBOARD_ABI,
      functionName: "getTopN",
      args: [BigInt(limit)],
    })) as [Address[], bigint[]];

    return addrs.map((player, i) => ({
      playerId: player,
      score: Number(scores[i] ?? 0n),
    }));
  } catch {
    return null;
  }
}

export async function submitScoreOnChain(
  score: number,
  duelId: string,
): Promise<{ ok: true; txHash: Hex } | { ok: false; reason: string }> {
  const address = contractAddress();
  if (!address) return { ok: false, reason: "NOT_CONFIGURED" };
  if (!hasEthereumProvider() || !window.ethereum) {
    return { ok: false, reason: "NO_WALLET" };
  }

  const player = getWalletAddress();
  if (!player) return { ok: false, reason: "NO_WALLET" };

  const duelBytes = duelIdToBytes32(duelId);
  if (!duelBytes) return { ok: false, reason: "INVALID_DUEL_ID" };

  try {
    const walletClient = createWalletClient({
      chain: GALILEO_CHAIN,
      transport: custom(window.ethereum),
    });

    const data = encodeFunctionData({
      abi: LEADERBOARD_ABI,
      functionName: "submitScore",
      args: [BigInt(score), duelBytes],
    });

    const txHash = await walletClient.sendTransaction({
      account: player as Address,
      to: address,
      data,
      chain: GALILEO_CHAIN,
    });

    const client = publicClient();
    await client.waitForTransactionReceipt({ hash: txHash });
    return { ok: true, txHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duel already submitted")) {
      return { ok: false, reason: "DUPLICATE_DUEL" };
    }
    return { ok: false, reason: msg };
  }
}

function duelIdToBytes32(duelId: string): Hex | null {
  const trimmed = duelId.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed as Hex;
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed}` as Hex;
  }
  return null;
}

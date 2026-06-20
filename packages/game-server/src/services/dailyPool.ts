import { ethers } from "ethers";
import { getContractService } from "./contract.js";

const POOL_ABI = [
  "function enterDaily(bytes32 daySeed) payable",
  "function closePool(bytes32 daySeed)",
  "function claimFor(bytes32 daySeed, address player, uint256 amount, uint8 rank)",
  "function poolInfo(bytes32 daySeed) view returns (tuple(uint256 totalStaked, uint256 entrants, bool closed))",
  "function getEntry(bytes32 daySeed, address player) view returns (tuple(address player, uint256 amount))",
  "function MIN_STAKE() view returns (uint256)",
];

const RANK_SHARES: Record<number, number> = {
  1: 0.4,
  2: 0.25,
  3: 0.15,
};

function poolAddress(): string | null {
  return process.env.ZEGON_DAILY_POOL_ADDRESS ?? null;
}

function seedToBytes32(seed: string): string {
  return ethers.id(seed);
}

export function isDailyPoolConfigured(): boolean {
  return Boolean(poolAddress() && process.env.SERVER_WALLET_PRIVATE_KEY);
}

export async function getPoolInfo(seed: string): Promise<{
  totalStaked: string;
  entrants: number;
  closed: boolean;
  minStake: string;
} | null> {
  const addr = poolAddress();
  if (!addr) return null;

  const contract = getContractService();
  const provider = contract.getProvider();
  if (!provider) return null;

  const pool = new ethers.Contract(addr, POOL_ABI, provider);
  const daySeed = seedToBytes32(seed);
  const info = await pool.poolInfo(daySeed);
  const minStake = await pool.MIN_STAKE();

  return {
    totalStaked: ethers.formatEther(info.totalStaked),
    entrants: Number(info.entrants),
    closed: Boolean(info.closed),
    minStake: ethers.formatEther(minStake),
  };
}

export async function hasEnteredPool(
  seed: string,
  playerAddress: string,
): Promise<boolean> {
  const addr = poolAddress();
  if (!addr) return false;

  const contract = getContractService();
  const provider = contract.getProvider();
  if (!provider) return false;

  const pool = new ethers.Contract(addr, POOL_ABI, provider);
  const entry = await pool.getEntry(seedToBytes32(seed), playerAddress);
  return entry.amount > 0n;
}

export function getPoolContractAddress(): string | undefined {
  return poolAddress() ?? undefined;
}

export function computeRankReward(
  rank: number,
  totalStakedWei: bigint,
  topTenCount: number,
): bigint {
  if (rank <= 0 || rank > 10) return 0n;
  if (rank <= 3) {
    const share = RANK_SHARES[rank] ?? 0;
    return (totalStakedWei * BigInt(Math.round(share * 1000))) / 1000n;
  }
  const remaining = 0.2;
  const sharePerRank = remaining / Math.max(1, topTenCount - 3);
  return (totalStakedWei * BigInt(Math.round(sharePerRank * 1000))) / 1000n;
}

export async function processDailyClaim(body: {
  seed: string;
  player: string;
  rank: number;
}): Promise<{ success: boolean; amount?: string; txHash?: string; reason?: string }> {
  if (!isDailyPoolConfigured()) {
    return { success: false, reason: "POOL_NOT_CONFIGURED" };
  }
  if (body.rank < 1 || body.rank > 10) {
    return { success: false, reason: "INVALID_RANK" };
  }

  const info = await getPoolInfo(body.seed);
  if (!info?.closed) {
    return { success: false, reason: "POOL_NOT_CLOSED" };
  }

  const entered = await hasEnteredPool(body.seed, body.player);
  if (!entered) {
    return { success: false, reason: "NOT_ENTERED" };
  }

  const addr = poolAddress()!;
  const contractSvc = getContractService();
  const provider = contractSvc.getProvider();
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!provider || !pk) {
    return { success: false, reason: "SERVER_NOT_CONFIGURED" };
  }

  const pool = new ethers.Contract(addr, POOL_ABI, new ethers.Wallet(pk, provider));
  const daySeed = seedToBytes32(body.seed);
  const onChainInfo = await pool.poolInfo(daySeed);
  const total = onChainInfo.totalStaked as bigint;
  const amountWei = computeRankReward(body.rank, total, 10);
  if (amountWei === 0n) {
    return { success: false, reason: "NO_REWARD" };
  }

  const tx = await pool.claimFor(daySeed, body.player, amountWei, body.rank);
  const receipt = await tx.wait();
  return {
    success: true,
    amount: ethers.formatEther(amountWei),
    txHash: receipt?.hash as string,
  };
}

export async function closeDailyPool(seed: string): Promise<string | undefined> {
  const addr = poolAddress();
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!addr || !pk) return undefined;

  const contract = getContractService();
  const provider = contract.getProvider();
  if (!provider) return undefined;

  const wallet = new ethers.Wallet(pk, provider);
  const pool = new ethers.Contract(addr, POOL_ABI, wallet);
  const tx = await pool.closePool(seedToBytes32(seed));
  const receipt = await tx.wait();
  return receipt?.hash;
}

export { seedToBytes32 };

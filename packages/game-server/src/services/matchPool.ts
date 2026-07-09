import { ethers } from "ethers";
import { getContractService } from "./contract.js";

const MATCH_ABI = [
  "function settle(bytes32 matchId, address winner)",
  "function getMatch(bytes32 matchId) view returns (tuple(address challenger, address defender, uint256 challengerStake, uint256 defenderStake, bool settled, address winner))",
  "function MIN_STAKE() view returns (uint256)",
];

function poolAddress(): string | null {
  return process.env.ZEGON_MATCH_POOL_ADDRESS ?? null;
}

export function isMatchPoolConfigured(): boolean {
  return Boolean(poolAddress() && process.env.SERVER_WALLET_PRIVATE_KEY);
}

export function getMatchPoolContractAddress(): string | null {
  return poolAddress();
}

export async function settleMatch(
  matchIdHex: string,
  winnerAddress: string,
): Promise<{ txHash?: string } | null> {
  const addr = poolAddress();
  if (!addr) return null;

  const contract = getContractService();
  const provider = contract.getProvider();
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!provider || !pk) return null;

  const matchId = matchIdHex.startsWith("0x") ? matchIdHex : `0x${matchIdHex}`;
  const pool = new ethers.Contract(addr, MATCH_ABI, new ethers.Wallet(pk, provider));
  const tx = await pool.settle(matchId, winnerAddress);
  const receipt = await tx.wait();
  return { txHash: receipt?.hash ?? tx.hash };
}

export async function getMatchInfo(matchIdHex: string): Promise<{
  challenger?: string;
  defender?: string;
  challengerStake?: string;
  defenderStake?: string;
  settled?: boolean;
  winner?: string;
} | null> {
  const addr = poolAddress();
  if (!addr) return null;

  const contract = getContractService();
  const provider = contract.getProvider();
  if (!provider) return null;

  const matchId = matchIdHex.startsWith("0x") ? matchIdHex : `0x${matchIdHex}`;
  const pool = new ethers.Contract(addr, MATCH_ABI, provider);
  const m = await pool.getMatch(matchId);
  return {
    challenger: m.challenger,
    defender: m.defender,
    challengerStake: ethers.formatEther(m.challengerStake),
    defenderStake: ethers.formatEther(m.defenderStake),
    settled: Boolean(m.settled),
    winner: m.winner,
  };
}

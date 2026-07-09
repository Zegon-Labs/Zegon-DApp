import {
  createWalletClient,
  custom,
  encodeFunctionData,
  parseEther,
} from "viem";
import {
  DailyStakeError,
  ensureGalileoNetwork,
  GALILEO_CHAIN,
} from "./dailyStake.js";

const MATCH_ABI = [
  {
    type: "function",
    name: "enterAsChallenger",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "enterAsDefender",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
] as const;

function matchIdToBytes32(matchIdHex: string): `0x${string}` {
  const hex = matchIdHex.startsWith("0x") ? matchIdHex.slice(2) : matchIdHex;
  return `0x${hex.padStart(64, "0").slice(0, 64)}` as `0x${string}`;
}

async function stakeMatch(
  poolAddress: string,
  matchIdHex: string,
  role: "challenger" | "defender",
  valueEth: string,
): Promise<string> {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new DailyStakeError("NO_WALLET");

  await ensureGalileoNetwork();

  const walletClient = createWalletClient({
    chain: GALILEO_CHAIN,
    transport: custom(eth as Parameters<typeof custom>[0]),
  });

  let account: `0x${string}` | undefined;
  try {
    [account] = await walletClient.requestAddresses();
  } catch {
    [account] = await walletClient.getAddresses();
  }
  if (!account) throw new DailyStakeError("NO_WALLET");

  const fn = role === "challenger" ? "enterAsChallenger" : "enterAsDefender";
  const data = encodeFunctionData({
    abi: MATCH_ABI,
    functionName: fn,
    args: [matchIdToBytes32(matchIdHex)],
  });

  const hash = await walletClient.sendTransaction({
    account,
    to: poolAddress as `0x${string}`,
    data,
    value: parseEther(valueEth),
    chain: GALILEO_CHAIN,
  });
  return hash;
}

export async function enterMatchAsChallenger(
  poolAddress: string,
  matchIdHex: string,
  valueEth: string,
): Promise<string> {
  return stakeMatch(poolAddress, matchIdHex, "challenger", valueEth);
}

export async function enterMatchAsDefender(
  poolAddress: string,
  matchIdHex: string,
  valueEth: string,
): Promise<string> {
  return stakeMatch(poolAddress, matchIdHex, "defender", valueEth);
}

export async function fetchMatchPoolInfo(): Promise<{
  configured: boolean;
  poolAddress?: string;
  minStake?: string;
}> {
  try {
    const res = await fetch("/api/match/pool");
    if (!res.ok) return { configured: false };
    return (await res.json()) as {
      configured: boolean;
      poolAddress?: string;
      minStake?: string;
    };
  } catch {
    return { configured: false };
  }
}

export { DailyStakeError as MatchStakeError };

import { ethers } from "ethers";
import { duelIdToBigInt } from "./commit.js";
import { ZegonAction } from "@zegon/game-core";
import { zegonActionToUint8 } from "./moveMapping.js";

const ZEGON_DUEL_ABI = [
  "function commitMove(uint256 duelId, uint256 roundId, bytes32 commit) external",
  "function revealMove(uint256 duelId, uint256 roundId, uint8 move, bytes32 salt) external",
  "function recordDuel(uint256 duelId, bytes32 attestationHash, uint8 result) external",
  "function getRound(uint256 duelId, uint256 roundId) view returns (bytes32 commit, bool revealed, uint8 zegonMove, uint64 commitTs, uint64 revealTs)",
  "event Committed(uint256 indexed duelId, uint256 indexed roundId, bytes32 commit, uint64 ts)",
  "event Revealed(uint256 indexed duelId, uint256 indexed roundId, uint8 move, uint64 ts)",
  "event DuelRecorded(uint256 indexed duelId, bytes32 attestationHash, uint8 result, uint64 ts)",
];

export const EXPLORER_BASE = "https://chainscan-galileo.0g.ai";

export interface TxResult {
  txHash: string;
  blockNumber?: number;
}

export interface OnChainRound {
  commit: string;
  revealed: boolean;
  zegonMove: number;
  commitTs: number;
  revealTs: number;
}

export class ContractService {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private contractAddress: string | null = null;

  constructor() {
    const rpc = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
    const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
    const address = process.env.ZEGON_DUEL_CONTRACT_ADDRESS;

    this.provider = new ethers.JsonRpcProvider(rpc);

    if (pk && address) {
      this.signer = new ethers.Wallet(pk, this.provider);
      this.contractAddress = address;
      this.contract = new ethers.Contract(address, ZEGON_DUEL_ABI, this.signer);
    }
  }

  getProvider(): ethers.JsonRpcProvider | null {
    return this.provider;
  }

  isConfigured(): boolean {
    return this.contract !== null;
  }

  getContractAddress(): string | null {
    return this.contractAddress;
  }

  async commitMove(
    duelId: string,
    roundId: number,
    commitHash: string,
  ): Promise<TxResult & { commitTs?: number } | null> {
    if (!this.contract || !this.provider) return null;
    const duelIdNum = duelIdToBigInt(duelId);
    const tx = await this.contract.commitMove(duelIdNum, roundId, commitHash);
    const receipt = await tx.wait();
    const onChain = await this.getRoundOnChain(duelId, roundId);
    return {
      txHash: tx.hash as string,
      blockNumber: receipt?.blockNumber,
      commitTs: onChain?.commitTs,
    };
  }

  async revealMove(
    duelId: string,
    roundId: number,
    move: ZegonAction,
    salt: string,
  ): Promise<TxResult | null> {
    if (!this.contract) return null;
    const duelIdNum = duelIdToBigInt(duelId);
    const moveNum = zegonActionToUint8(move);
    const saltBytes = `0x${salt.padStart(64, "0").slice(0, 64)}`;
    const tx = await this.contract.revealMove(
      duelIdNum,
      roundId,
      moveNum,
      saltBytes,
    );
    return { txHash: tx.hash as string };
  }

  async recordDuel(
    duelId: string,
    attestationHash: string,
    result: number,
  ): Promise<TxResult | null> {
    if (!this.contract) return null;
    const duelIdNum = duelIdToBigInt(duelId);
    const hash = attestationHash.startsWith("0x")
      ? attestationHash
      : `0x${attestationHash.padStart(64, "0").slice(0, 64)}`;
    const tx = await this.contract.recordDuel(duelIdNum, hash, result);
    return { txHash: tx.hash as string };
  }

  async getRoundOnChain(
    duelId: string,
    roundId: number,
  ): Promise<OnChainRound | null> {
    if (!this.contract) return null;
    const duelIdNum = duelIdToBigInt(duelId);
    const round = await this.contract.getRound(duelIdNum, roundId);
    return {
      commit: round.commit as string,
      revealed: round.revealed as boolean,
      zegonMove: Number(round.zegonMove),
      commitTs: Number(round.commitTs),
      revealTs: Number(round.revealTs),
    };
  }

  /** Scan on-chain rounds until an empty commit (serverless-safe verify fallback). */
  async listRoundsOnChain(
    duelId: string,
    maxRounds = 64,
  ): Promise<OnChainRound[]> {
    const zero =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const out: OnChainRound[] = [];
    for (let i = 0; i < maxRounds; i++) {
      const round = await this.getRoundOnChain(duelId, i);
      if (!round || round.commit === zero) break;
      out.push(round);
    }
    return out;
  }

  getExplorerUrl(duelId: string): string | undefined {
    if (!this.contractAddress) return undefined;
    return `${EXPLORER_BASE}/address/${this.contractAddress}?duel=${duelId}`;
  }

  getTxExplorerUrl(txHash: string): string {
    return `${EXPLORER_BASE}/tx/${txHash}`;
  }
}

let instance: ContractService | null = null;

export function getContractService(): ContractService {
  if (!instance) {
    instance = new ContractService();
  }
  return instance;
}

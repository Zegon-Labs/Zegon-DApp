import { ethers } from "ethers";

const ZEGON_DUEL_ABI = [
  "function commitMove(uint256 duelId, uint256 roundId, bytes32 commit) external",
  "function revealMove(uint256 duelId, uint256 roundId, uint8 move, bytes32 salt) external",
  "function recordDuel(uint256 duelId, bytes32 attestationHash, uint8 result) external",
  "event Committed(uint256 indexed duelId, uint256 indexed roundId, bytes32 commit, uint64 ts)",
  "event Revealed(uint256 indexed duelId, uint256 indexed roundId, uint8 move, uint64 ts)",
  "event DuelRecorded(uint256 indexed duelId, bytes32 attestationHash, uint8 result, uint64 ts)",
];

const EXPLORER_BASE = "https://chainscan-galileo.0g.ai";

export class ContractService {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Wallet | null = null;

  constructor() {
    const rpc = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
    const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
    const address = process.env.ZEGON_DUEL_CONTRACT_ADDRESS;

    if (pk && address) {
      const provider = new ethers.JsonRpcProvider(rpc);
      this.signer = new ethers.Wallet(pk, provider);
      this.contract = new ethers.Contract(address, ZEGON_DUEL_ABI, this.signer);
    }
  }

  isConfigured(): boolean {
    return this.contract !== null;
  }

  async commitMove(
    duelId: string,
    roundId: number,
    commitHash: string,
  ): Promise<void> {
    if (!this.contract) return;
    const duelIdNum = BigInt("0x" + duelId.slice(0, 16));
    await this.contract.commitMove(duelIdNum, roundId, "0x" + commitHash);
  }

  async revealMove(
    duelId: string,
    roundId: number,
    move: string,
    salt: string,
  ): Promise<void> {
    if (!this.contract) return;
    const moveMap: Record<string, number> = {
      FIRE_HIGH: 0,
      FIRE_LOW: 1,
      DODGE: 2,
      FEINT: 3,
      RELOAD: 4,
    };
    const duelIdNum = BigInt("0x" + duelId.slice(0, 16));
    const saltBytes = ethers.id(salt);
    await this.contract.revealMove(
      duelIdNum,
      roundId,
      moveMap[move] ?? 0,
      saltBytes,
    );
  }

  async recordDuel(
    duelId: string,
    attestationHash: string,
    result: number,
  ): Promise<void> {
    if (!this.contract) return;
    const duelIdNum = BigInt("0x" + duelId.slice(0, 16));
    await this.contract.recordDuel(
      duelIdNum,
      "0x" + attestationHash.padStart(64, "0"),
      result,
    );
  }

  getExplorerUrl(duelId: string): string | undefined {
    const address = process.env.ZEGON_DUEL_CONTRACT_ADDRESS;
    if (!address) return undefined;
    return `${EXPLORER_BASE}/address/${address}?duel=${duelId}`;
  }
}

let instance: ContractService | null = null;

export function getContractService(): ContractService {
  if (!instance) {
    instance = new ContractService();
  }
  return instance;
}

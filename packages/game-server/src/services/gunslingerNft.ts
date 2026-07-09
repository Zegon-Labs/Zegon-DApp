import { ethers } from "ethers";
import type { PlayerProfile } from "./profileTypes.js";
import { EXPLORER_BASE } from "./contract.js";
import {
  buildGunslingerTokenMetadata,
  gunslingerTokenMetadataUrl,
} from "./gunslingerTokenMetadata.js";

const GUNSLINGER_ABI = [
  "function mint(address to, string uri) external returns (uint256)",
  "function setTokenURI(uint256 tokenId, string uri) external",
  "function burn(address owner) external",
  "function tokenOfOwner(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event GunslingerMinted(address indexed owner, uint256 indexed tokenId, string tokenURI)",
  "event GunslingerUpdated(uint256 indexed tokenId, string tokenURI)",
  "event GunslingerBurned(address indexed owner, uint256 indexed tokenId)",
];

export interface GunslingerMintResult {
  tokenId: string;
  contractAddress: string;
  metadataRootHash: string;
  portraitRootHash?: string;
  tokenUri: string;
  txHash: string;
  explorerUrl: string;
  updated: boolean;
}

export interface GunslingerBurnResult {
  tokenId: string;
  contractAddress: string;
  txHash: string;
  explorerUrl: string;
}

export class GunslingerNftService {
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  constructor() {
    const rpc = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
    const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
    const address = process.env.ZEGON_GUNSLINGER_CONTRACT_ADDRESS;

    if (pk && address) {
      const provider = new ethers.JsonRpcProvider(rpc);
      const signer = new ethers.Wallet(pk, provider);
      this.contractAddress = address;
      this.contract = new ethers.Contract(address, GUNSLINGER_ABI, signer);
    }
  }

  isConfigured(): boolean {
    return this.contract !== null;
  }

  getContractAddress(): string | null {
    return this.contractAddress;
  }

  async tokenOfOwner(owner: string): Promise<bigint> {
    if (!this.contract) return 0n;
    return this.contract.tokenOfOwner(ethers.getAddress(owner)) as Promise<bigint>;
  }

  async mintOrUpdate(profile: PlayerProfile, lang: "en" | "es"): Promise<GunslingerMintResult> {
    if (!this.contract || !this.contractAddress) {
      throw new Error("GUNSLINGER_CONTRACT_NOT_CONFIGURED");
    }
    const gs = profile.gunslinger;
    if (!gs?.rank || !gs.bio || !gs.evaluatedAt) {
      throw new Error("GUNSLINGER_NOT_EVALUATED");
    }

    const metadata = buildGunslingerTokenMetadata(profile, lang);
    if (!metadata) {
      throw new Error("GUNSLINGER_NOT_EVALUATED");
    }

    const tokenUri = gunslingerTokenMetadataUrl(profile.address);
    const owner = profile.address;
    const existingToken: bigint = await this.contract.tokenOfOwner(owner);
    let txHash: string;
    let tokenId: string;
    let updated = false;

    if (existingToken > 0n) {
      tokenId = existingToken.toString();
      const tx = await this.contract.setTokenURI(existingToken, tokenUri);
      await tx.wait();
      txHash = tx.hash as string;
      updated = true;
    } else {
      const tx = await this.contract.mint(owner, tokenUri);
      await tx.wait();
      txHash = tx.hash as string;
      const mintedId: bigint = await this.contract.tokenOfOwner(owner);
      tokenId = mintedId.toString();
    }

    return {
      tokenId,
      contractAddress: this.contractAddress,
      metadataRootHash: tokenUri,
      tokenUri,
      txHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
      updated,
    };
  }

  async burnForOwner(owner: string): Promise<GunslingerBurnResult> {
    if (!this.contract || !this.contractAddress) {
      throw new Error("GUNSLINGER_CONTRACT_NOT_CONFIGURED");
    }
    const normalized = ethers.getAddress(owner);
    const tokenId: bigint = await this.contract.tokenOfOwner(normalized);
    if (tokenId === 0n) {
      throw new Error("NO_TOKEN_TO_BURN");
    }

    try {
      const tx = await this.contract.burn(normalized);
      await tx.wait();
      return {
        tokenId: tokenId.toString(),
        contractAddress: this.contractAddress,
        txHash: tx.hash as string,
        explorerUrl: `${EXPLORER_BASE}/tx/${tx.hash as string}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("burn") || message.includes("missing revert data")) {
        throw new Error("BURN_NOT_SUPPORTED");
      }
      throw err;
    }
  }
}

let instance: GunslingerNftService | null = null;

export function getGunslingerNftService(): GunslingerNftService {
  if (!instance) instance = new GunslingerNftService();
  return instance;
}

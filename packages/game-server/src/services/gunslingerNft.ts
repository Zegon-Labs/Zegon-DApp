import { ethers } from "ethers";
import {
  gunslingerPortraitRelativePath,
  gunslingerRankName,
} from "@zegon/game-core";
import type { PlayerProfile } from "./profileTypes.js";
import {
  readPortraitBytes,
  storageDownloadUrl,
  uploadBytesToStorage,
  uploadJsonToStorage,
} from "./storage.js";
import { EXPLORER_BASE } from "./contract.js";

const GUNSLINGER_ABI = [
  "function mint(address to, string uri) external returns (uint256)",
  "function setTokenURI(uint256 tokenId, string uri) external",
  "function tokenOfOwner(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event GunslingerMinted(address indexed owner, uint256 indexed tokenId, string tokenURI)",
  "event GunslingerUpdated(uint256 indexed tokenId, string tokenURI)",
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

  async mintOrUpdate(profile: PlayerProfile, lang: "en" | "es"): Promise<GunslingerMintResult> {
    if (!this.contract || !this.contractAddress) {
      throw new Error("GUNSLINGER_CONTRACT_NOT_CONFIGURED");
    }
    const gs = profile.gunslinger;
    if (!gs?.rank || !gs.bio || !gs.evaluatedAt) {
      throw new Error("GUNSLINGER_NOT_EVALUATED");
    }

    const gender = gs.characterGender ?? "man";
    const relativePath = gunslingerPortraitRelativePath(gs.rank, gender);
    const portraitBytes = await readPortraitBytes(relativePath);
    if (!portraitBytes) {
      throw new Error("PORTRAIT_NOT_FOUND");
    }

    const portraitKey = `gunslinger-portrait-${profile.address}-${gs.rank}-${gender}`;
    const portraitUpload = await uploadBytesToStorage(portraitKey, portraitBytes);
    if (!portraitUpload.rootHash) {
      throw new Error("PORTRAIT_UPLOAD_FAILED");
    }

    const rankName = gunslingerRankName(gs.rank, lang);
    const metadata = {
      name: `${profile.nickname} — ${rankName}`,
      description: gs.bio,
      image: storageDownloadUrl(portraitUpload.rootHash),
      external_url: process.env.SIWE_DOMAIN
        ? `https://${process.env.SIWE_DOMAIN}`
        : "https://zegon-dapp.vercel.app",
      attributes: [
        { trait_type: "Rank", value: rankName },
        { trait_type: "Rank Level", value: gs.rank },
        { trait_type: "Nickname", value: profile.nickname },
        { trait_type: "Duels Won", value: profile.stats.duelsWon },
        { trait_type: "Duels Played", value: profile.stats.duelsPlayed },
        { trait_type: "Verified Duels", value: profile.stats.verifiedDuels },
        { trait_type: "Character", value: gender === "woman" ? "Woman" : "Man" },
      ],
    };

    const metadataKey = `gunslinger-metadata-${profile.address}-${Date.now()}`;
    const metadataUpload = await uploadJsonToStorage(metadataKey, metadata);
    if (!metadataUpload.rootHash) {
      throw new Error("METADATA_UPLOAD_FAILED");
    }

    const tokenUri = storageDownloadUrl(metadataUpload.rootHash);
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
      metadataRootHash: metadataUpload.rootHash,
      portraitRootHash: portraitUpload.rootHash,
      tokenUri,
      txHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
      updated,
    };
  }
}

let instance: GunslingerNftService | null = null;

export function getGunslingerNftService(): GunslingerNftService {
  if (!instance) instance = new GunslingerNftService();
  return instance;
}

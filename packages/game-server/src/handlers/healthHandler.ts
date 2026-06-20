import { getContractService } from "../services/contract.js";

const GALILEO_CHAIN_ID = 16602;

export async function handleHealth(): Promise<{
  ok: boolean;
  useOgCompute: boolean;
  brainMode: "tee" | "dummy";
  contractConfigured: boolean;
  contractAddress?: string;
  storageConfigured: boolean;
  storageIndexer: string;
  chainId: number;
  ogModel: string;
  dailyPoolConfigured: boolean;
  dailyPoolAddress?: string;
}> {
  const useOgCompute = process.env.USE_OG_COMPUTE === "true";
  const contract = getContractService();
  const contractAddress = contract.getContractAddress() ?? undefined;
  const storageIndexer =
    process.env.OG_STORAGE_INDEXER ?? "https://indexer-storage-turbo.0g.ai";
  const dailyPoolAddress = process.env.ZEGON_DAILY_POOL_ADDRESS;

  return {
    ok: true,
    useOgCompute,
    brainMode: useOgCompute ? "tee" : "dummy",
    contractConfigured: contract.isConfigured(),
    contractAddress,
    storageConfigured: Boolean(process.env.OG_STORAGE_INDEXER),
    storageIndexer,
    chainId: GALILEO_CHAIN_ID,
    ogModel: process.env.OG_MODEL ?? "glm-5-fp8",
    dailyPoolConfigured: Boolean(dailyPoolAddress),
    dailyPoolAddress,
  };
}

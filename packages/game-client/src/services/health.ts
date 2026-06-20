export interface HealthStatus {
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
}

let cached: HealthStatus | null = null;

export async function fetchHealth(force = false): Promise<HealthStatus> {
  if (cached && !force) return cached;
  const res = await fetch("/api/health");
  if (!res.ok) {
    return {
      ok: false,
      useOgCompute: false,
      brainMode: "dummy",
      contractConfigured: false,
      storageConfigured: false,
      storageIndexer: "",
      chainId: 16602,
      ogModel: "glm-5-fp8",
      dailyPoolConfigured: false,
    };
  }
  cached = (await res.json()) as HealthStatus;
  return cached;
}

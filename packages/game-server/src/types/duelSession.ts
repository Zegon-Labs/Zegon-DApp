import type { DuelConfig, ZegonDecision } from "@zegon/game-core";

export interface RoundLog {
  roundIndex: number;
  commitHash: string;
  salt: string;
  inputHash: string;
  attestationHash?: string;
  attestation?: unknown;
  decision: ZegonDecision;
  commitTimestamp: number;
  playerActionTimestamp?: number;
  playerAction?: string;
  itemUsed?: string;
  predictionCorrect?: boolean;
  commitTxHash?: string;
  revealTxHash?: string;
  commitTsOnChain?: number;
}

export interface DuelSession {
  id: string;
  config: DuelConfig;
  roundIndex: number;
  logs: RoundLog[];
  createdAt: number;
  storageRoot?: string;
  recordTxHash?: string;
  result?: number;
}

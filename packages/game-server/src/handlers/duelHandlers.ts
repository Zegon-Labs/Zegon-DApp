import { randomBytes } from "node:crypto";
import {
  DuelConfig,
  DummyZegonBrain,
  RoundContext,
  ZegonDecision,
  buildChallengeUrl,
  createDailyDuel,
} from "@zegon/game-core";
import { computeCommitHash, computeInputHash } from "../services/commit.js";
import { getContractService } from "../services/contract.js";
import { getLeaderboard, submitScore } from "../services/leaderboard.js";
import { getOGComputeService } from "../services/ogCompute.js";
import { storeDuelLog } from "../services/storage.js";

export interface DuelSession {
  id: string;
  config: DuelConfig;
  roundIndex: number;
  logs: unknown[];
  createdAt: number;
}

const sessions = new Map<string, DuelSession>();

function generateDuelId(): string {
  return randomBytes(16).toString("hex");
}

export async function handleStartDuel(body: {
  config?: Partial<DuelConfig>;
}): Promise<{ duelId: string }> {
  const duelId = generateDuelId();
  sessions.set( duelId, {
    id: duelId,
    config: { ...createDailyDuel(), ...body.config, mode: body.config?.mode ?? "standard" },
    roundIndex: 0,
    logs: [],
    createdAt: Date.now(),
  });
  return { duelId };
}

export async function handleRoundCommit(body: {
  duelId: string;
  context: RoundContext;
}): Promise<{
  decision: ZegonDecision;
  commitHash: string;
  attestationHash?: string;
}> {
  const session = sessions.get(body.duelId);
  if (!session) {
    throw new Error("Duel not found");
  }

  const inputHash = computeInputHash(body.context);
  let decision: ZegonDecision;
  let attestationHash: string | undefined;

  const useOG = process.env.USE_OG_COMPUTE === "true";

  if (useOG) {
    try {
      const og = getOGComputeService();
      const result = await og.infer(body.context);
      decision = result.decision;
      attestationHash = result.attestationHash;
    } catch {
      decision = await new DummyZegonBrain(session.config.seed).decide(body.context);
    }
  } else {
    decision = await new DummyZegonBrain(session.config.seed).decide(body.context);
  }

  const { commitHash, salt } = computeCommitHash(decision.zegonMove);

  const contract = getContractService();
  if (contract.isConfigured()) {
    await contract.commitMove(body.duelId, session.roundIndex, commitHash);
  }

  session.logs.push({
    roundIndex: session.roundIndex,
    commitHash,
    salt,
    inputHash,
    attestationHash,
    decision,
    commitTimestamp: Date.now(),
  });

  return { decision, commitHash, attestationHash };
}

export async function handleRoundReveal(body: {
  duelId: string;
  roundIndex: number;
  playerAction: string;
}): Promise<{ verified: boolean }> {
  const session = sessions.get(body.duelId);
  if (!session) {
    throw new Error("Duel not found");
  }

  const log = session.logs[body.roundIndex] as {
    commitHash: string;
    salt: string;
    decision: ZegonDecision;
  } | undefined;

  if (!log) {
    throw new Error("Round log not found");
  }

  const contract = getContractService();
  if (contract.isConfigured()) {
    await contract.revealMove(
      body.duelId,
      body.roundIndex,
      log.decision.zegonMove,
      log.salt,
    );
  }

  session.roundIndex += 1;
  return { verified: true };
}

export async function handleRecordDuel(body: {
  duelId: string;
  result: number;
  attestationHash: string;
}): Promise<{ stored: boolean; storageRoot?: string }> {
  const session = sessions.get(body.duelId);
  if (!session) {
    throw new Error("Duel not found");
  }

  const contract = getContractService();
  if (contract.isConfigured()) {
    await contract.recordDuel(body.duelId, body.attestationHash, body.result);
  }

  const storageRoot = await storeDuelLog(body.duelId, session.logs);
  return { stored: true, storageRoot };
}

export async function handleVerify(duelId: string): Promise<{
  duelId: string;
  verified: boolean;
  rounds: unknown[];
  explorerUrl?: string;
}> {
  const session = sessions.get(duelId);
  const contract = getContractService();

  return {
    duelId,
    verified: session !== undefined,
    rounds: session?.logs ?? [],
    explorerUrl: contract.getExplorerUrl(duelId),
  };
}

export async function handleDailyLeaderboard(): Promise<{
  date: string;
  entries: Awaited<ReturnType<typeof getLeaderboard>>;
}> {
  const daily = createDailyDuel();
  const entries = await getLeaderboard(daily.seed!);
  return { date: daily.seed!, entries };
}

export async function handleSubmitScore(body: {
  playerId: string;
  score: number;
  seed: string;
}): Promise<{ accepted: boolean }> {
  await submitScore(body.playerId, body.score, body.seed);
  return { accepted: true };
}

export { buildChallengeUrl };

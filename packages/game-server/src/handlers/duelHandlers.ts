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
import { EXPLORER_BASE, getContractService } from "../services/contract.js";
import { getLeaderboard, submitScore } from "../services/leaderboard.js";
import { getOGComputeService } from "../services/ogCompute.js";
import { loadSession, saveSession } from "../services/sessionStore.js";
import { storeDuelLog, loadDuelLogPayload } from "../services/storage.js";
import { uint8ToZegonAction } from "../services/moveMapping.js";
import { encodeSessionToken, decodeSessionToken } from "../utils/sessionToken.js";
import type { DuelSession, RoundLog } from "../types/duelSession.js";

export type { DuelSession, RoundLog };

const sessions = new Map<string, DuelSession>();

function generateDuelId(): string {
  return randomBytes(16).toString("hex");
}

async function getSession(
  duelId: string,
  sessionToken?: string,
): Promise<DuelSession | null> {
  if (sessionToken) {
    const decoded = decodeSessionToken(sessionToken);
    if (decoded?.id === duelId) {
      sessions.set(duelId, decoded);
      return decoded;
    }
  }
  const cached = sessions.get(duelId);
  if (cached) return cached;
  const loaded = await loadSession(duelId);
  if (loaded) {
    sessions.set(duelId, loaded);
    return loaded;
  }
  return null;
}

async function persistSession(session: DuelSession): Promise<void> {
  sessions.set(session.id, session);
  await saveSession(session);
}

export async function handleStartDuel(body: {
  config?: Partial<DuelConfig>;
}): Promise<{ duelId: string; sessionToken: string }> {
  const duelId = generateDuelId();
  const session: DuelSession = {
    id: duelId,
    config: {
      ...createDailyDuel(),
      ...body.config,
      mode: body.config?.mode ?? "standard",
    },
    roundIndex: 0,
    logs: [],
    createdAt: Date.now(),
  };
  await persistSession(session);
  return { duelId, sessionToken: encodeSessionToken(session) };
}

export async function handleRoundCommit(body: {
  duelId: string;
  context: RoundContext;
  locale?: "en" | "es";
  sessionToken?: string;
}): Promise<{
  taunt: string;
  commitHash: string;
  commitTxHash?: string;
  roundIndex: number;
  attestationHash?: string;
  commitTsOnChain?: number;
  sessionToken: string;
}> {
  const session = await getSession(body.duelId, body.sessionToken);
  if (!session) {
    throw new Error("Duel not found");
  }

  const inputHash = computeInputHash(body.context);
  let decision: ZegonDecision;
  let attestationHash: string | undefined;
  let attestation: unknown;

  const useOG = process.env.USE_OG_COMPUTE === "true";

  if (useOG) {
    const og = getOGComputeService();
    const result = await og.infer(body.context);
    decision = result.decision;
    attestationHash = result.attestationHash;
    attestation = result.attestation;
  } else {
    decision = await new DummyZegonBrain(
      session.config.seed,
      body.locale ?? "en",
    ).decide(body.context);
  }

  const { commitHash, salt } = computeCommitHash(decision.zegonMove);

  const contract = getContractService();
  let commitTxHash: string | undefined;
  let commitTsOnChain: number | undefined;

  if (contract.isConfigured()) {
    const tx = await contract.commitMove(
      body.duelId,
      session.roundIndex,
      commitHash,
    );
    commitTxHash = tx?.txHash;
    const onChain = await contract.getRoundOnChain(
      body.duelId,
      session.roundIndex,
    );
    commitTsOnChain = onChain?.commitTs;
  }

  const log: RoundLog = {
    roundIndex: session.roundIndex,
    commitHash,
    salt,
    inputHash,
    attestationHash,
    attestation,
    decision,
    commitTimestamp: Date.now(),
    commitTxHash,
    commitTsOnChain,
  };

  session.logs.push(log);
  await persistSession(session);

  return {
    taunt: decision.taunt,
    commitHash,
    commitTxHash,
    roundIndex: session.roundIndex,
    attestationHash,
    commitTsOnChain,
    sessionToken: encodeSessionToken(session),
  };
}

export async function handleRoundReveal(body: {
  duelId: string;
  roundIndex: number;
  playerAction: string;
  playerActionTimestamp?: number;
  sessionToken?: string;
}): Promise<{
  verified: boolean;
  decision: ZegonDecision;
  revealTxHash?: string;
  sessionToken: string;
}> {
  const session = await getSession(body.duelId, body.sessionToken);
  if (!session) {
    throw new Error("Duel not found");
  }

  const log = session.logs.find((l) => l.roundIndex === body.roundIndex);
  if (!log) {
    throw new Error("Round log not found");
  }

  log.playerAction = body.playerAction;
  log.playerActionTimestamp =
    body.playerActionTimestamp ?? Date.now();

  const contract = getContractService();
  let revealTxHash: string | undefined;

  if (contract.isConfigured()) {
    const tx = await contract.revealMove(
      body.duelId,
      body.roundIndex,
      log.decision.zegonMove,
      log.salt,
    );
    revealTxHash = tx?.txHash;
    log.revealTxHash = revealTxHash;
  }

  session.roundIndex += 1;
  await persistSession(session);

  return {
    verified: true,
    decision: log.decision,
    revealTxHash,
    sessionToken: encodeSessionToken(session),
  };
}

export async function handleRecordDuel(body: {
  duelId: string;
  result: number;
  attestationHash: string;
  sessionToken?: string;
}): Promise<{
  stored: boolean;
  storageRoot?: string;
  storageTxHash?: string;
  recordTxHash?: string;
  sessionToken?: string;
}> {
  const session = await getSession(body.duelId, body.sessionToken);
  if (!session) {
    throw new Error("Duel not found");
  }

  const contract = getContractService();
  let recordTxHash: string | undefined;

  if (contract.isConfigured()) {
    const tx = await contract.recordDuel(
      body.duelId,
      body.attestationHash,
      body.result,
    );
    recordTxHash = tx?.txHash;
  }

  const storage = await storeDuelLog(body.duelId, session.logs);
  session.storageRoot = storage.rootHash ?? storage.localPath;
  session.recordTxHash = recordTxHash;
  session.result = body.result;
  await persistSession(session);

  return {
    stored: true,
    storageRoot: storage.rootHash ?? storage.localPath,
    storageTxHash: storage.txHash,
    recordTxHash,
    sessionToken: encodeSessionToken(session),
  };
}

export async function handleVerify(duelId: string): Promise<{
  duelId: string;
  verified: boolean;
  contractAddress?: string;
  rounds: Array<{
    roundIndex: number;
    commitHash: string;
    commitTxHash?: string;
    revealTxHash?: string;
    commitTxExplorerUrl?: string;
    revealTxExplorerUrl?: string;
    commitTsOnChain?: number;
    playerActionTimestamp?: number;
    commitBeforePlayer: boolean;
    zegonMove?: string;
    attestationHash?: string;
    onChain?: {
      commit: string;
      revealed: boolean;
      zegonMove: number;
      commitTs: number;
      revealTs: number;
      zegonMoveLabel?: string;
    };
  }>;
  storageRoot?: string;
  recordTxHash?: string;
  explorerUrl?: string;
  contractExplorerUrl?: string;
  recordTxExplorerUrl?: string;
}> {
  const session = await getSession(duelId);
  const contract = getContractService();
  const storedPayload = await loadDuelLogPayload(duelId);
  const logs: RoundLog[] =
    session?.logs ??
    (storedPayload?.logs as RoundLog[] | undefined) ??
    [];

  const rounds = await Promise.all(
    (logs as RoundLog[]).map(async (log) => {
      const onChain = contract.isConfigured()
        ? await contract.getRoundOnChain(duelId, log.roundIndex)
        : null;

      const commitTs = log.commitTsOnChain ?? onChain?.commitTs;
      const playerTs = log.playerActionTimestamp;
      const commitBeforePlayer =
        commitTs !== undefined &&
        playerTs !== undefined &&
        commitTs <= Math.floor(playerTs / 1000);

      return {
        roundIndex: log.roundIndex,
        commitHash: log.commitHash,
        commitTxHash: log.commitTxHash,
        commitTxExplorerUrl: log.commitTxHash
          ? contract.getTxExplorerUrl(log.commitTxHash)
          : undefined,
        revealTxHash: log.revealTxHash,
        revealTxExplorerUrl: log.revealTxHash
          ? contract.getTxExplorerUrl(log.revealTxHash)
          : undefined,
        commitTsOnChain: commitTs,
        playerActionTimestamp: playerTs,
        commitBeforePlayer,
        zegonMove: log.decision?.zegonMove,
        attestationHash: log.attestationHash,
        onChain: onChain
          ? {
              ...onChain,
              zegonMoveLabel: uint8ToZegonAction(onChain.zegonMove),
            }
          : undefined,
      };
    }),
  );

  const allCommitBeforePlayer =
    rounds.length > 0 && rounds.every((r) => r.commitBeforePlayer);

  return {
    duelId,
    verified: allCommitBeforePlayer || (session !== null && rounds.length > 0),
    contractAddress: contract.getContractAddress() ?? undefined,
    rounds,
    storageRoot: session?.storageRoot,
    recordTxHash: session?.recordTxHash,
    explorerUrl: contract.getExplorerUrl(duelId),
    contractExplorerUrl: contract.getContractAddress()
      ? `${EXPLORER_BASE}/address/${contract.getContractAddress()}`
      : undefined,
    recordTxExplorerUrl: session?.recordTxHash
      ? contract.getTxExplorerUrl(session.recordTxHash)
      : undefined,
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

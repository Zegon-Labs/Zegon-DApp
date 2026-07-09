import { randomBytes, createHash } from "node:crypto";
import {
  DuelConfig,
  DummyZegonBrain,
  DuelItemId,
  PlayerAction,
  RoundContext,
  ZegonAction,
  ZegonDecision,
  buildChallengeUrl,
  createDailyDuel,
  DEFAULT_DUEL_CONFIG,
  withUniqueDuelSeed,
} from "@zegon/game-core";
import { computeCommitHash, computeInputHash } from "../services/commit.js";
import { EXPLORER_BASE, getContractService } from "../services/contract.js";
import { getLeaderboard, submitScore, type LeaderboardEntry } from "../services/leaderboard.js";
import { createChallengeLink, getChallengeLink } from "../services/challengeLinks.js";
import {
  submitGlobalScore,
} from "../services/globalLeaderboard.js";
import {
  getProfile,
  getProfileByNickname,
  getNicknamesForAddresses,
  setProfile,
  isWalletAddress,
  hasDailyAttempt,
  updateProfileStats,
  purchaseUpgrade,
  purchaseRelic,
  equipConsumable,
  consumeEquippedConsumable,
} from "../services/playerProfiles.js";
import {
  buildSiweMessage,
  createNonce,
  requireSiweOrDev,
} from "../services/db.js";
import {
  getStatsBoard,
  getPlayerRank,
  type StatsBoardType,
} from "../services/statsLeaderboard.js";
import {
  getSeasonInfo,
  getPlayerSeasonClaim,
  closeSeason,
} from "../services/seasons.js";
import { getOGComputeService } from "../services/ogCompute.js";
import { loadSession, saveSession } from "../services/sessionStore.js";
import { storeDuelLog, loadDuelLogPayload } from "../services/storage.js";
import {
  getPoolInfo,
  getPoolContractAddress,
  getDailyPoolRankRewards,
  hasEnteredPool,
  processDailyClaim,
  isDailyPoolConfigured,
} from "../services/dailyPool.js";
import { uint8ToZegonAction } from "../services/moveMapping.js";
import { encodeSessionToken, decodeSessionToken } from "../utils/sessionToken.js";
import type { DuelSession, RoundLog } from "../types/duelSession.js";
import { handleHealth } from "./healthHandler.js";
import {
  getMetricsSummary,
  sendMetricsReport,
  trackMetric,
} from "../services/metrics.js";

export { handleHealth };

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
  if (session.logs.length > 0) {
    void storeDuelLog(session.id, session.logs).catch((err) => {
      console.warn("[persistSession] duel log persist failed:", err);
    });
  }
}

function isChainStubLog(log: RoundLog): boolean {
  return !log.salt && !log.inputHash;
}

function mergeRoundLog(base: RoundLog, patch: Partial<RoundLog>): RoundLog {
  const patchLog = patch as RoundLog;
  const patchIsStub = patchLog.roundIndex != null && isChainStubLog(patchLog);
  const baseIsStub = isChainStubLog(base);

  const decision =
    patchIsStub && !baseIsStub
      ? base.decision
      : !patchIsStub && baseIsStub
        ? patchLog.decision ?? base.decision
        : patchLog.decision?.taunt
          ? patchLog.decision
          : base.decision ?? patchLog.decision;

  return {
    ...base,
    ...patch,
    decision,
    playerAction: patch.playerAction ?? base.playerAction,
    itemUsed: patch.itemUsed ?? base.itemUsed,
    predictionCorrect: patch.predictionCorrect ?? base.predictionCorrect,
    commitTxHash: patch.commitTxHash ?? base.commitTxHash,
    revealTxHash: patch.revealTxHash ?? base.revealTxHash,
    commitTsOnChain: patch.commitTsOnChain ?? base.commitTsOnChain,
    commitTimestamp: patch.commitTimestamp ?? base.commitTimestamp,
    playerActionTimestamp: patch.playerActionTimestamp ?? base.playerActionTimestamp,
    attestationHash: patch.attestationHash ?? base.attestationHash,
  };
}

function mergeRoundLogsByIndex(...sources: Array<RoundLog[] | undefined>): RoundLog[] {
  const byIndex = new Map<number, RoundLog>();
  for (const source of sources) {
    if (!source?.length) continue;
    for (const log of source) {
      const prev = byIndex.get(log.roundIndex);
      byIndex.set(log.roundIndex, prev ? mergeRoundLog(prev, log) : { ...log });
    }
  }
  return [...byIndex.values()].sort((a, b) => a.roundIndex - b.roundIndex);
}

type ClientRoundLog = {
  roundIndex: number;
  playerAction: string;
  itemUsed?: string;
  predictionCorrect?: boolean;
  predictedMove?: string;
  zegonMove?: string;
};

function wasPlayerRead(
  playerAction: string,
  predictedMove: string,
  itemUsed?: string,
): boolean {
  if (playerAction === PlayerAction.USE_ITEM && itemUsed === DuelItemId.SMOKE) {
    return false;
  }
  return predictedMove === playerAction;
}

function applyClientRoundLogs(
  session: DuelSession,
  clientLogs?: ClientRoundLog[],
): void {
  if (!clientLogs?.length) return;

  for (const cr of clientLogs) {
    let log = session.logs.find((l) => l.roundIndex === cr.roundIndex);
    if (!log) {
      log = {
        roundIndex: cr.roundIndex,
        commitHash: "",
        salt: "",
        inputHash: "",
        decision: {
          predictedPlayerMove: (cr.predictedMove as PlayerAction) ?? PlayerAction.FIRE,
          zegonMove: (cr.zegonMove as ZegonAction) ?? ZegonAction.DODGE,
          confidence: 0,
          taunt: "",
        },
        commitTimestamp: Date.now(),
      };
      session.logs.push(log);
    }

    if (!log.playerAction && cr.playerAction) {
      log.playerAction = cr.playerAction;
    }
    if (cr.itemUsed) {
      log.itemUsed = cr.itemUsed;
    }
    if (cr.predictionCorrect != null) {
      log.predictionCorrect = cr.predictionCorrect;
    } else if (log.playerAction && log.decision?.predictedPlayerMove) {
      log.predictionCorrect = wasPlayerRead(
        log.playerAction,
        log.decision.predictedPlayerMove,
        log.itemUsed,
      );
    }
    if (cr.predictedMove) {
      log.decision.predictedPlayerMove = cr.predictedMove as PlayerAction;
    }
    if (cr.zegonMove) {
      log.decision.zegonMove = cr.zegonMove as ZegonAction;
    }
  }

  session.logs.sort((a, b) => a.roundIndex - b.roundIndex);
}

async function loadChainRoundLogs(duelId: string): Promise<RoundLog[]> {
  const contract = getContractService();
  if (!contract.isConfigured()) return [];

  const onChain = await contract.listRoundsOnChain(duelId);
  if (onChain.length === 0) return [];

  let chainRounds = onChain;
  while (
    chainRounds.length > 0 &&
    !chainRounds[chainRounds.length - 1]!.revealed
  ) {
    chainRounds = chainRounds.slice(0, -1);
  }
  if (chainRounds.length === 0) return [];

  return chainRounds.map((round, roundIndex) => ({
    roundIndex,
    commitHash: round.commit,
    salt: "",
    inputHash: "",
    decision: {
      predictedPlayerMove: PlayerAction.FIRE,
      zegonMove: uint8ToZegonAction(round.zegonMove),
      confidence: 0,
      taunt: "",
    },
    commitTimestamp: round.commitTs > 0 ? round.commitTs * 1000 : 0,
    commitTsOnChain: round.commitTs,
    playerActionTimestamp:
      round.revealed && round.revealTs > round.commitTs
        ? round.revealTs * 1000
        : undefined,
  }));
}

async function resolveLogsForVerify(
  duelId: string,
  sessionToken?: string,
): Promise<{ logs: RoundLog[]; session: DuelSession | null; source: "session" | "local" | "chain" }> {
  const session = await getSession(duelId, sessionToken);
  const stored = await loadDuelLogPayload(duelId);
  const storedLogs = stored?.logs as RoundLog[] | undefined;
  const sessionLogs = session?.logs ?? [];
  const chainLogs = await loadChainRoundLogs(duelId);

  const merged = mergeRoundLogsByIndex(chainLogs, sessionLogs, storedLogs);
  if (merged.length === 0) {
    return { logs: [], session, source: "session" };
  }

  const hasStoredMoves = storedLogs?.some((l) => l.playerAction !== undefined) ?? false;
  const hasSessionMoves = sessionLogs.some((l) => l.playerAction !== undefined);
  const source: "session" | "local" | "chain" =
    hasStoredMoves ? "local" : hasSessionMoves ? "session" : chainLogs.length ? "chain" : "session";

  return { logs: merged, session, source };
}

function compositeAttestationHash(logs: RoundLog[], duelId: string): string {
  const hashes = logs
    .map((l) => l.attestationHash)
    .filter((h): h is string => Boolean(h));
  if (hashes.length === 0) {
    return createHash("sha256").update(duelId).digest("hex");
  }
  return createHash("sha256").update(hashes.join(":")).digest("hex");
}

export async function handleStartDuel(body: {
  config?: Partial<DuelConfig>;
}): Promise<{ duelId: string; sessionToken: string }> {
  const duelId = generateDuelId();
  const mode = body.config?.mode ?? "standard";
  const baseConfig: DuelConfig =
    mode === "daily"
      ? { ...createDailyDuel(), ...body.config, mode: "daily" }
      : {
          ...DEFAULT_DUEL_CONFIG,
          ...body.config,
          mode: mode === "challenge" ? "challenge" : "standard",
        };

  const config =
    mode === "challenge" && body.config?.seed
      ? { ...baseConfig, seed: body.config.seed }
      : withUniqueDuelSeed(baseConfig, duelId);

  const session: DuelSession = {
    id: duelId,
    config,
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
  predictedPlayerMove: string;
  confidence: number;
  commitHash: string;
  commitTxHash?: string;
  roundIndex: number;
  attestationHash?: string;
  commitTsOnChain?: number;
  brainMode: "tee" | "dummy";
  sessionToken: string;
}> {
  const session = await getSession(body.duelId, body.sessionToken);
  if (!session) {
    throw new Error("Duel not found");
  }

  if (body.context.roundIndex !== session.roundIndex) {
    throw new Error(
      `Round index mismatch: expected ${session.roundIndex}, got ${body.context.roundIndex}`,
    );
  }

  const pendingLog = session.logs.find(
    (l) => l.roundIndex === session.roundIndex && l.playerAction === undefined,
  );
  if (pendingLog) {
    return {
      taunt: pendingLog.decision.taunt,
      predictedPlayerMove: pendingLog.decision.predictedPlayerMove,
      confidence: pendingLog.decision.confidence,
      commitHash: pendingLog.commitHash,
      commitTxHash: pendingLog.commitTxHash,
      roundIndex: pendingLog.roundIndex,
      attestationHash: pendingLog.attestationHash,
      commitTsOnChain: pendingLog.commitTsOnChain,
      brainMode: pendingLog.attestationHash ? "tee" : "dummy",
      sessionToken: encodeSessionToken(session),
    };
  }

  const inputHash = computeInputHash(body.context);
  let decision: ZegonDecision;
  let attestationHash: string | undefined;
  let attestation: unknown;
  let brainMode: "tee" | "dummy" = "dummy";

  const useOG = process.env.USE_OG_COMPUTE === "true";

  if (useOG) {
    try {
      const og = getOGComputeService();
      const result = await og.infer(body.context, session.config.seed);
      decision = result.decision;
      attestationHash = result.attestationHash;
      attestation = result.attestation;
      brainMode = "tee";
    } catch (err) {
      console.warn("[round/commit] OG compute failed, using dummy brain:", err);
      decision = await new DummyZegonBrain(
        session.config.seed,
        body.locale ?? "en",
      ).decide(body.context);
      brainMode = "dummy";
    }
  } else {
    decision = await new DummyZegonBrain(
      session.config.seed,
      body.locale ?? "en",
    ).decide(body.context);
    brainMode = "dummy";
  }

  const { commitHash, salt } = computeCommitHash(decision.zegonMove);

  const contract = getContractService();
  let commitTxHash: string | undefined;
  let commitTsOnChain: number | undefined;
  const sealedAt = Date.now();

  if (contract.isConfigured()) {
    try {
      const tx = await contract.commitMove(
        body.duelId,
        session.roundIndex,
        commitHash,
      );
      commitTxHash = tx?.txHash;
      commitTsOnChain = tx?.commitTs;
    } catch (err) {
      console.warn("[round/commit] On-chain commit failed:", err);
    }
  }

  const log: RoundLog = {
    roundIndex: session.roundIndex,
    commitHash,
    salt,
    inputHash,
    attestationHash,
    attestation,
    decision,
    commitTimestamp: sealedAt,
    commitTxHash,
    commitTsOnChain,
  };

  session.logs.push(log);
  await persistSession(session);

  return {
    taunt: decision.taunt,
    predictedPlayerMove: decision.predictedPlayerMove,
    confidence: decision.confidence,
    commitHash,
    commitTxHash,
    roundIndex: session.roundIndex,
    attestationHash,
    commitTsOnChain,
    brainMode,
    sessionToken: encodeSessionToken(session),
  };
}

export async function handleRoundReveal(body: {
  duelId: string;
  roundIndex: number;
  playerAction: string;
  playerActionTimestamp?: number;
  itemUsed?: string;
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

  if (
    log.playerActionTimestamp !== undefined &&
    body.playerActionTimestamp !== undefined &&
    body.playerActionTimestamp <= log.commitTimestamp
  ) {
    throw new Error("Player action timestamp must be after ZEGON commit");
  }

  log.playerAction = body.playerAction;
  if (body.itemUsed) {
    log.itemUsed = body.itemUsed;
  } else if (body.playerAction !== "USE_ITEM") {
    log.itemUsed = undefined;
  }
  log.predictionCorrect = wasPlayerRead(
    body.playerAction,
    log.decision.predictedPlayerMove,
    log.itemUsed,
  );
  log.playerActionTimestamp =
    body.playerActionTimestamp ?? Date.now();

  if (log.playerActionTimestamp <= log.commitTimestamp) {
    log.playerActionTimestamp = log.commitTimestamp + 1;
  }

  const contract = getContractService();
  let revealTxHash: string | undefined;

  if (contract.isConfigured()) {
    try {
      const tx = await contract.revealMove(
        body.duelId,
        body.roundIndex,
        log.decision.zegonMove,
        log.salt,
      );
      revealTxHash = tx?.txHash;
      log.revealTxHash = revealTxHash;
    } catch (err) {
      console.warn("[round/reveal] On-chain reveal failed:", err);
    }
  }

  session.roundIndex += 1;
  await persistSession(session);
  void storeDuelLog(body.duelId, session.logs).catch((err) => {
    console.warn("[round/reveal] duel log persist failed:", err);
  });

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
  roundLogs?: ClientRoundLog[];
}): Promise<{
  stored: boolean;
  storageRoot?: string;
  storageTxHash?: string;
  recordTxHash?: string;
  sessionToken?: string;
}> {
  const session = await getSession(body.duelId, body.sessionToken);
  if (!session) {
    // Session storage is ephemeral on serverless; recording is best-effort.
    return { stored: false };
  }

  applyClientRoundLogs(session, body.roundLogs);

  const contract = getContractService();
  let recordTxHash: string | undefined;

  const attestationHash =
    body.attestationHash && body.attestationHash.length >= 64
      ? body.attestationHash
      : compositeAttestationHash(session.logs, body.duelId);

  if (contract.isConfigured()) {
    try {
      const tx = await contract.recordDuel(
        body.duelId,
        attestationHash,
        body.result,
      );
      recordTxHash = tx?.txHash;
    } catch (err) {
      console.error("recordDuel on-chain failed:", err);
    }
  }

  let storage: Awaited<ReturnType<typeof storeDuelLog>>;
  try {
    storage = await storeDuelLog(body.duelId, session.logs);
  } catch (err) {
    console.error("storeDuelLog failed:", err);
    storage = { localPath: undefined };
  }
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

export async function handleVerify(
  duelId: string,
  sessionToken?: string,
): Promise<{
  duelId: string;
  verified: boolean;
  teeVerified: boolean;
  brainMode: "tee" | "dummy";
  contractAddress?: string;
  storageIndexerUrl?: string;
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
    playerAction?: string;
    predictedMove?: string;
    itemUsed?: string;
    predictionCorrect?: boolean;
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
  storageUrl?: string;
  recordTxHash?: string;
  explorerUrl?: string;
  contractExplorerUrl?: string;
  recordTxExplorerUrl?: string;
}> {
  const { logs, session, source } = await resolveLogsForVerify(duelId, sessionToken);
  const contract = getContractService();

  const rounds = await Promise.all(
    (logs as RoundLog[]).map(async (log) => {
      const onChain = contract.isConfigured()
        ? await contract.getRoundOnChain(duelId, log.roundIndex)
        : null;

      const commitTs = log.commitTsOnChain ?? onChain?.commitTs;
      const playerTs = log.playerActionTimestamp;
      const serverSealedFirst =
        typeof log.commitTimestamp === "number" &&
        typeof playerTs === "number" &&
        log.commitTimestamp < playerTs;
      const onChainSealedFirst =
        commitTs !== undefined &&
        commitTs > 0 &&
        typeof playerTs === "number" &&
        commitTs <= Math.floor(playerTs / 1000);
      const chainOnlySealed =
        source === "chain" &&
        onChain?.revealed === true &&
        (onChain.commitTs ?? 0) > 0 &&
        (onChain.revealTs ?? 0) >= (onChain.commitTs ?? 0);
      const sessionPlayedRound =
        source === "session" &&
        log.playerAction !== undefined &&
        Boolean(log.commitHash || log.commitTxHash);
      const commitBeforePlayer =
        serverSealedFirst ||
        onChainSealedFirst ||
        chainOnlySealed ||
        sessionPlayedRound;

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
        commitTimestamp: log.commitTimestamp,
        playerActionTimestamp: playerTs,
        commitBeforePlayer,
        zegonMove: log.decision?.zegonMove,
        playerAction: log.playerAction,
        predictedMove: log.decision?.predictedPlayerMove,
        itemUsed: log.itemUsed,
        predictionCorrect: log.predictionCorrect,
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

  const hasAttestation = rounds.some((r) => Boolean(r.attestationHash));
  const useOg = process.env.USE_OG_COMPUTE === "true";
  const storageIndexerUrl =
    process.env.OG_STORAGE_INDEXER ?? "https://indexer-storage-turbo.0g.ai";

  const verified =
    rounds.length > 0 &&
    (allCommitBeforePlayer ||
      (source === "chain" && rounds.every((r) => r.onChain?.revealed)));

  return {
    duelId,
    verified,
    teeVerified: useOg && hasAttestation,
    brainMode: useOg ? "tee" : "dummy",
    contractAddress: contract.getContractAddress() ?? undefined,
    storageIndexerUrl,
    rounds,
    storageRoot: session?.storageRoot,
    storageUrl: session?.storageRoot
      ? `${storageIndexerUrl}/download?root=${encodeURIComponent(session.storageRoot)}`
      : undefined,
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
  entries: Array<LeaderboardEntry & { nickname?: string; displayName?: string }>;
}> {
  const daily = createDailyDuel();
  const entries = await getLeaderboard(daily.seed!);
  const walletEntries = entries.filter((e) => isWalletAddress(e.playerId));
  const nicknames = await getNicknamesForAddresses(walletEntries.map((e) => e.playerId));

  const enriched = walletEntries.slice(0, 10).map((e) => {
    const key = e.playerId.toLowerCase();
    const nickname = nicknames[key];
    return {
      ...e,
      nickname,
      displayName: nickname ?? `${e.playerId.slice(0, 6)}…${e.playerId.slice(-4)}`,
    };
  });

  return { date: daily.seed!, entries: enriched };
}

export async function handleGlobalLeaderboard(query?: {
  board?: string;
  address?: string;
}): Promise<{
  board: StatsBoardType;
  entries: Array<{
    playerId: string;
    nickname?: string;
    displayName?: string;
    value: number;
    secondary?: number;
    timestamp?: number;
  }>;
  playerRank?: { rank: number | null; total: number; value: number | null };
  season?: Awaited<ReturnType<typeof getSeasonInfo>>;
}> {
  const board = (query?.board ?? "score") as StatsBoardType;
  const validBoards: StatsBoardType[] = [
    "score",
    "hunter",
    "veteran",
    "ghost",
    "speed",
    "verified",
  ];
  const boardType = validBoards.includes(board) ? board : "score";

  const entries = await getStatsBoard(boardType, 50);
  const nicknames = await getNicknamesForAddresses(entries.map((e) => e.playerId));
  const enriched = entries.map((e) => {
    const key = e.playerId.toLowerCase();
    const nickname = e.nickname ?? nicknames[key];
    return {
      ...e,
      nickname,
      displayName: nickname ?? `${e.playerId.slice(0, 6)}…${e.playerId.slice(-4)}`,
    };
  });

  const season = await getSeasonInfo();
  let playerRank;
  if (query?.address && isWalletAddress(query.address)) {
    playerRank = await getPlayerRank(query.address, boardType);
  }

  return { board: boardType, entries: enriched, playerRank, season };
}

export async function handleGlobalSubmit(body: {
  playerId: string;
  score: number;
  duelId?: string;
  nickname?: string;
  won?: boolean;
  timesRead?: number;
  roundsPlayed?: number;
  maxReadingStreak?: number;
  playTimeMs?: number;
  verifiedOnChain?: boolean;
  auth?: { message?: string; signature?: string };
}): Promise<{ accepted: boolean; reason?: string; dailyRank?: number }> {
  if (!isWalletAddress(body.playerId)) {
    return { accepted: false, reason: "WALLET_REQUIRED" };
  }
  if (!Number.isFinite(body.score) || body.score < 0) {
    return { accepted: false, reason: "INVALID_SCORE" };
  }

  const siwe = requireSiweOrDev(body.playerId, body.auth);
  if (!siwe.ok) return { accepted: false, reason: siwe.error };

  if (body.duelId) {
    const verify = await handleVerify(body.duelId);
    if (!verify.verified) {
      return { accepted: false, reason: "DUEL_NOT_VERIFIED" };
    }
  }

  const profile = await getProfile(body.playerId);
  const nickname = profile?.nickname ?? body.nickname?.trim();
  await submitGlobalScore(body.playerId, body.score, body.duelId, nickname);

  if (profile) {
    await updateProfileStats(body.playerId, {
      globalScore: body.score,
      won: body.won,
      timesRead: body.timesRead,
      roundsPlayed: body.roundsPlayed,
      maxReadingStreak: body.maxReadingStreak,
      playTimeMs: body.playTimeMs,
      verifiedOnChain: body.verifiedOnChain,
    });
  }

  return { accepted: true };
}

export async function handleGetPlayerProfile(address: string): Promise<{
  profile: Awaited<ReturnType<typeof getProfile>>;
}> {
  const profile = await getProfile(address);
  return { profile };
}

export async function handleSetPlayerProfile(body: {
  address: string;
  nickname: string;
  auth?: { message?: string; signature?: string };
}): Promise<{ profile: Awaited<ReturnType<typeof setProfile>> }> {
  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) throw new Error(siwe.error);
  const profile = await setProfile(body.address, body.nickname);
  return { profile };
}

export async function handleSubmitScore(body: {
  playerId: string;
  score: number;
  seed: string;
  duelId?: string;
  won?: boolean;
  timesRead?: number;
  xpGain?: number;
  achievements?: string[];
}): Promise<{ accepted: boolean; reason?: string; dailyRank?: number }> {
  if (!isWalletAddress(body.playerId)) {
    return { accepted: false, reason: "WALLET_REQUIRED" };
  }
  const profile = await getProfile(body.playerId);
  if (!profile) {
    return { accepted: false, reason: "PROFILE_REQUIRED" };
  }

  const todaySeed = createDailyDuel().seed!;
  if (body.seed !== todaySeed) {
    return { accepted: false, reason: "INVALID_DAILY_SEED" };
  }
  if (hasDailyAttempt(profile, body.seed)) {
    return { accepted: false, reason: "DAILY_ALREADY_SUBMITTED" };
  }

  if (body.duelId) {
    const verify = await handleVerify(body.duelId);
    if (!verify.verified) {
      return { accepted: false, reason: "DUEL_NOT_VERIFIED" };
    }
  }

  await submitScore(body.playerId, body.score, body.seed);
  await updateProfileStats(body.playerId, {
    xpGain: body.xpGain ?? Math.floor(body.score / 10),
    won: body.won,
    timesRead: body.timesRead,
    dailyScore: body.score,
    dailySeed: body.seed,
    duelId: body.duelId,
    newAchievements: body.achievements,
  });

  const board = await getStatsBoard("score", 100);
  const rankIdx = board.findIndex(
    (e) => e.playerId.toLowerCase() === body.playerId.toLowerCase(),
  );
  const dailyRank = rankIdx >= 0 ? rankIdx + 1 : undefined;

  return { accepted: true, dailyRank };
}

export async function handleUpdateProfileStats(body: {
  address: string;
  nickname?: string;
  xpGain?: number;
  notchesGain?: number;
  won?: boolean;
  timesRead?: number;
  roundsPlayed?: number;
  maxReadingStreak?: number;
  playTimeMs?: number;
  globalScore?: number;
  verifiedOnChain?: boolean;
  achievements?: string[];
  unlocks?: string[];
  duelDay?: string;
  auth?: { message?: string; signature?: string };
}): Promise<
  | { accepted: true; profile: Awaited<ReturnType<typeof updateProfileStats>> }
  | { accepted: false; reason: string }
> {
  if (!isWalletAddress(body.address)) {
    return { accepted: false, reason: "INVALID_ADDRESS" };
  }

  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) return { accepted: false, reason: siwe.error };

  let existing = await getProfile(body.address);
  if (!existing && body.nickname?.trim()) {
    try {
      existing = await setProfile(body.address, body.nickname.trim());
    } catch {
      return { accepted: false, reason: "PROFILE_REQUIRED" };
    }
  }
  if (!existing) {
    return { accepted: false, reason: "PROFILE_REQUIRED" };
  }

  const profile = await updateProfileStats(body.address, {
    xpGain: body.xpGain,
    notchesGain: body.notchesGain,
    won: body.won,
    timesRead: body.timesRead,
    roundsPlayed: body.roundsPlayed,
    maxReadingStreak: body.maxReadingStreak,
    playTimeMs: body.playTimeMs,
    globalScore: body.globalScore,
    verifiedOnChain: body.verifiedOnChain,
    newAchievements: body.achievements,
    newUnlocks: body.unlocks,
    duelDay: body.duelDay,
  });
  return { accepted: true, profile };
}

export async function handleDailyPoolInfo(seed?: string): Promise<{
  seed: string;
  configured: boolean;
  poolAddress?: string;
  totalStaked?: string;
  entrants?: number;
  closed?: boolean;
  minStake?: string;
  rankRewards?: Array<{
    rank: number;
    sharePercent: number;
    label: string;
    note?: string;
  }>;
}> {
  const dailySeed = seed ?? createDailyDuel().seed!;
  const configured = isDailyPoolConfigured();
  const rankRewards = getDailyPoolRankRewards().map((r) => ({
    rank: r.rank,
    sharePercent: r.sharePercent,
    label: r.label,
    ...(r.note ? { note: r.note } : {}),
  }));
  if (!configured) {
    return {
      seed: dailySeed,
      configured: false,
      poolAddress: getPoolContractAddress(),
      rankRewards,
    };
  }
  const info = await getPoolInfo(dailySeed);
  return {
    seed: dailySeed,
    configured: true,
    poolAddress: getPoolContractAddress(),
    totalStaked: info?.totalStaked,
    entrants: info?.entrants,
    closed: info?.closed,
    minStake: info?.minStake,
    rankRewards,
  };
}

export async function handleDailyClaim(body: {
  seed: string;
  player: string;
  rank: number;
}): Promise<Awaited<ReturnType<typeof processDailyClaim>>> {
  return processDailyClaim(body);
}

export async function handleDailyEnterCheck(body: {
  seed: string;
  player: string;
}): Promise<{ entered: boolean; configured: boolean }> {
  return {
    entered: await hasEnteredPool(body.seed, body.player),
    configured: isDailyPoolConfigured(),
  };
}

export async function handleCreateChallengeLink(body: {
  payload: Record<string, unknown>;
}): Promise<{ id: string; urlPath: string }> {
  const { id } = await createChallengeLink(body.payload ?? {});
  return { id, urlPath: `?c=${id}` };
}

export async function handleGetChallengeLink(
  id: string,
): Promise<{ payload: Record<string, unknown> | null }> {
  const entry = await getChallengeLink(id);
  return { payload: entry?.payload ?? null };
}

export async function handleTrackMetric(body: {
  event?: unknown;
  visitorId?: unknown;
  wallet?: unknown;
}): Promise<Awaited<ReturnType<typeof trackMetric>>> {
  return trackMetric(body);
}

export async function handleMetricsSummary(
  date?: string,
): Promise<Awaited<ReturnType<typeof getMetricsSummary>>> {
  return getMetricsSummary(date);
}

export async function handleMetricsReport(
  date?: string,
): Promise<Awaited<ReturnType<typeof sendMetricsReport>>> {
  return sendMetricsReport(date);
}

export async function handleAuthNonce(address: string): Promise<{
  nonce: string;
  message: string;
}> {
  if (!isWalletAddress(address)) throw new Error("INVALID_ADDRESS");
  const nonce = createNonce(address);
  const message = buildSiweMessage(address, nonce);
  return { nonce, message };
}

export async function handlePurchaseUpgrade(body: {
  address: string;
  upgradeId: string;
  auth?: { message?: string; signature?: string };
}): Promise<{ profile: Awaited<ReturnType<typeof purchaseUpgrade>> }> {
  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) throw new Error(siwe.error);
  const profile = await purchaseUpgrade(
    body.address,
    body.upgradeId as import("@zegon/game-core").UpgradeId,
  );
  return { profile };
}

export async function handlePurchaseRelic(body: {
  address: string;
  relicId: string;
  auth?: { message?: string; signature?: string };
}): Promise<{ profile: Awaited<ReturnType<typeof purchaseRelic>> }> {
  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) throw new Error(siwe.error);
  const profile = await purchaseRelic(
    body.address,
    body.relicId as import("@zegon/game-core").SaloonRelicId,
  );
  return { profile };
}

export async function handleEquipConsumable(body: {
  address: string;
  relicId: string | null;
  auth?: { message?: string; signature?: string };
}): Promise<{ profile: Awaited<ReturnType<typeof equipConsumable>> }> {
  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) throw new Error(siwe.error);
  const profile = await equipConsumable(
    body.address,
    body.relicId as import("@zegon/game-core").SaloonRelicId | null,
  );
  return { profile };
}

export async function handleConsumeEquippedConsumable(body: {
  address: string;
  auth?: { message?: string; signature?: string };
}): Promise<{ profile: Awaited<ReturnType<typeof consumeEquippedConsumable>> }> {
  const siwe = requireSiweOrDev(body.address, body.auth);
  if (!siwe.ok) throw new Error(siwe.error);
  const profile = await consumeEquippedConsumable(body.address);
  return { profile };
}

export async function handleDuelReplay(
  duelId: string,
  sessionToken?: string,
): Promise<{
  duelId: string;
  rounds: Array<{
    roundIndex: number;
    predictedMove?: string;
    zegonMove?: string;
    playerAction?: string;
    itemUsed?: string;
    predictionCorrect?: boolean;
    taunt?: string;
    playerDamage?: number;
    zegonDamage?: number;
    blindsightBefore?: number;
    blindsightAfter?: number;
    commitTimestamp?: number;
    playerActionTimestamp?: number;
    commitBeforePlayer?: boolean;
  }>;
}> {
  const { logs } = await resolveLogsForVerify(duelId, sessionToken);
  const rounds = logs.map((log) => ({
    roundIndex: log.roundIndex,
    predictedMove: log.decision?.predictedPlayerMove,
    zegonMove: log.decision?.zegonMove,
    playerAction: log.playerAction,
    itemUsed: log.itemUsed,
    predictionCorrect: log.predictionCorrect,
    taunt: log.decision?.taunt,
    commitTimestamp: log.commitTimestamp,
    playerActionTimestamp: log.playerActionTimestamp,
    commitBeforePlayer:
      typeof log.commitTimestamp === "number" &&
      typeof log.playerActionTimestamp === "number" &&
      log.commitTimestamp < log.playerActionTimestamp,
  }));
  return { duelId, rounds };
}

export async function handleGetPublicProfile(query: {
  address?: string;
  nickname?: string;
}): Promise<{ profile: Awaited<ReturnType<typeof getProfile>> }> {
  if (query.address && isWalletAddress(query.address)) {
    return { profile: await getProfile(query.address) };
  }
  if (query.nickname) {
    return { profile: await getProfileByNickname(query.nickname) };
  }
  return { profile: null };
}

export async function handleSeasonClaim(body: {
  address: string;
}): Promise<{
  claimable: boolean;
  entry?: Awaited<ReturnType<typeof getPlayerSeasonClaim>>;
}> {
  if (!isWalletAddress(body.address)) {
    return { claimable: false };
  }
  const entry = await getPlayerSeasonClaim(body.address);
  return { claimable: Boolean(entry), entry: entry ?? undefined };
}

export async function handleCloseSeason(body: { seasonId: string }): Promise<{
  season: Awaited<ReturnType<typeof closeSeason>>;
}> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && body.seasonId) {
    // Operator-only via cron in production
  }
  return { season: await closeSeason(body.seasonId) };
}

export { buildChallengeUrl };

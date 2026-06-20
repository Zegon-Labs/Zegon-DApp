import Phaser from "phaser";
import { createDailyDuel, DuelWinner, xpForResult, type DuelResult } from "@zegon/game-core";
import { format, t } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { getCachedProfile } from "../services/profile.js";
import { getWalletAddress } from "../services/wallet.js";
import { createMenuButton, drawScanlines } from "../ui/components.js";
import { C, COLORS, FONT } from "../ui/theme.js";
import { buildChallengeUrlFromResult, generateShareCard } from "../utils/shareCard.js";

interface VerifyRound {
  roundIndex: number;
  commitHash: string;
  commitTxHash?: string;
  revealTxHash?: string;
  commitBeforePlayer: boolean;
  zegonMove?: string;
}

interface VerifyResponse {
  duelId: string;
  verified: boolean;
  teeVerified?: boolean;
  brainMode?: string;
  contractAddress?: string;
  rounds: VerifyRound[];
  storageRoot?: string;
  storageUrl?: string;
  recordTxHash?: string;
  explorerUrl?: string;
  recordTxExplorerUrl?: string;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: {
    result: DuelResult;
    duelId?: string | null;
    apiBaseUrl?: string;
    mode?: "standard" | "daily";
    archetype?: string;
    brainMode?: "tee" | "dummy";
  }): void {
    const { width, height } = this.scale;
    const result = data.result;
    const strings = t();
    const duelId = data.duelId;
    const apiBase = data.apiBaseUrl ?? "";
    const mode = data.mode ?? "standard";

    this.cameras.main.setBackgroundColor(C.void);
    drawScanlines(this);

    const panel = this.add.rectangle(width / 2, height / 2, 460, 380, C.ash, 0.95);
    panel.setStrokeStyle(1, C.fog);

    const winnerLabel =
      result.winner === "PLAYER"
        ? strings.youWin
        : result.winner === "ZEGON"
          ? strings.zegonWins
          : strings.draw;

    this.add
      .text(width / 2, height / 2 - 120, winnerLabel, {
        fontFamily: FONT,
        fontSize: "40px",
        color: result.winner === "PLAYER" ? COLORS.verified : COLORS.ember,
      })
      .setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 50, [
      `${strings.rounds}: ${result.roundsPlayed}`,
      `${strings.timesRead}: ${result.timesRead}`,
      `${strings.finalBlindsight}: ${result.finalBlindsight}%`,
      `${strings.score}: ${result.score}`,
    ].join("\n"), {
      fontFamily: FONT,
      fontSize: "20px",
      color: COLORS.bone,
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5);

    const verifyLabel = this.add.text(width / 2, height / 2 + 20, "", {
      fontFamily: FONT,
      fontSize: "14px",
      color: COLORS.cyan,
      align: "center",
      wordWrap: { width: 400 },
    }).setOrigin(0.5);

    const dailyLabel = this.add.text(width / 2, height / 2 + 48, "", {
      fontFamily: FONT,
      fontSize: "13px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: 400 },
    }).setOrigin(0.5);

    if (mode === "daily") {
      void this.submitDailyScore(result, dailyLabel, duelId);
    }

    createMenuButton(this, width / 2, height / 2 + 90, strings.verifyOnChain, () => {
      if (duelId) {
        window.open(`/verify.html?duel=${encodeURIComponent(duelId)}`, "_blank");
      } else {
        verifyLabel.setText(strings.verifyOffline);
      }
    });

    if (duelId) {
      void this.loadVerifySummary(`${apiBase}/api/duel/verify/${duelId}`, verifyLabel);
    }

    createMenuButton(this, width / 2, height / 2 + 140, strings.share, () => {
      const text = format(strings.shareText, {
        score: result.score,
        timesRead: result.timesRead,
      });
      void navigator.clipboard?.writeText(text);
    });

    createMenuButton(this, width / 2, height / 2 + 190, strings.shareCard, () => {
      void generateShareCard(result, {
        archetype: data.archetype,
        brainMode: data.brainMode,
      });
    });

    createMenuButton(this, width / 2, height / 2 + 240, strings.challengeLink, () => {
      const seed = mode === "daily" ? createDailyDuel().seed! : `standard-${data.archetype ?? "reader"}`;
      const url = buildChallengeUrlFromResult(seed, data.archetype);
      void navigator.clipboard?.writeText(url);
    });

    createMenuButton(this, width / 2, height / 2 + 290, strings.menu, () => {
      gameBridge.navigate({ type: "hub" });
    });
  }

  private async submitDailyScore(
    result: DuelResult,
    label: Phaser.GameObjects.Text,
    duelId?: string | null,
  ): Promise<void> {
    const strings = t();
    const address = getWalletAddress();
    if (!address) {
      label.setText(strings.scoreSubmitNoWallet);
      return;
    }

    if (!getCachedProfile(address)?.nickname) {
      label.setText(strings.scoreSubmitNoProfile);
      return;
    }

    const daily = createDailyDuel();
    try {
      const res = await fetch("/api/daily/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: address,
          score: result.score,
          seed: daily.seed,
          duelId: duelId ?? undefined,
          won: result.winner === DuelWinner.PLAYER,
          timesRead: result.timesRead,
          xpGain: xpForResult(result),
        }),
      });
      const data = (await res.json()) as { accepted?: boolean; reason?: string };
      if (res.ok && data.accepted !== false) {
        label.setText(strings.scoreSubmitted).setColor(COLORS.cyan);
      } else if (data.reason === "PROFILE_REQUIRED") {
        label.setText(strings.scoreSubmitNoProfile);
      } else if (data.reason === "DAILY_ALREADY_SUBMITTED") {
        label.setText(strings.dailyAlreadySubmitted);
      } else if (data.reason === "DUEL_NOT_VERIFIED") {
        label.setText(strings.duelNotVerified);
      }
    } catch {
      label.setText(strings.leaderboardEmpty);
    }
  }

  private async loadVerifySummary(
    url: string,
    label: Phaser.GameObjects.Text,
  ): Promise<void> {
    const strings = t();
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as VerifyResponse;
      const proofCount = data.rounds.filter((r) => r.commitBeforePlayer).length;
      const status = data.verified ? strings.verifyOk : strings.verifyPending;
      const tee = data.teeVerified ? `\n0G TEE ✓` : "";
      label.setText(
        `${status}${tee}\n${strings.verifyRounds}: ${proofCount}/${data.rounds.length}` +
        (data.contractAddress ? `\n${data.contractAddress.slice(0, 10)}…` : ""),
      );
    } catch {
      label.setText(strings.verifyPending);
    }
  }
}

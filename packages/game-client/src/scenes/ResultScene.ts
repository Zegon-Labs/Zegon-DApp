import Phaser from "phaser";
import {
  buildScoreBreakdownFromResult,
  createDailyDuel,
  DuelWinner,
  xpForResult,
  type ChallengeMeta,
  type DuelResult,
} from "@zegon/game-core";
import { format, onLanguageChange, t } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { getCachedProfile, hasNickname } from "../services/profile.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";
import {
  createHubResultPanel,
  createLandingBackdrop,
  preloadLandingBackdrop,
  preloadResultPanelAssets,
} from "../ui/hub/index.js";
import { drawScanlines } from "../ui/components.js";
import { C, COLORS } from "../ui/theme.js";
import { formatScoreBreakdown } from "../ui/scoreBreakdownText.js";
import { buildChallengeUrlFromResult, generateShareCard, shareOnX } from "../utils/shareCard.js";
import { playDuelEndSfx, playSfx } from "../services/sfx.js";
import { trackMetric } from "../services/metrics.js";
import { playDuelEndVoice, stopAllVoice } from "../services/voice.js";
import { openVerifyDuelWindow } from "../utils/verifyWindow.js";
import { verifyApiUrl } from "../services/duelSessionStorage.js";
import {
  isLeaderboardContractConfigured,
  submitScoreOnChain,
} from "../services/onchainLeaderboard.js";

interface VerifyResponse {
  duelId: string;
  verified: boolean;
  teeVerified?: boolean;
  rounds: Array<{ commitBeforePlayer: boolean }>;
}

export class ResultScene extends Phaser.Scene {
  private panelHandle: ReturnType<typeof createHubResultPanel> | null = null;
  private result!: DuelResult;
  private duelId: string | null = null;
  private apiBaseUrl = "";
  private mode: "standard" | "daily" = "standard";
  private archetype?: string;
  private brainMode?: "tee" | "dummy";
  private scoreOptions: { dailyStreakDays?: number; surpriseStreak?: number } = {};
  private scoreSubmitted = false;
  private verifyProof: string | undefined;
  private challengeMeta?: ChallengeMeta;
  private localeUnsub: (() => void) | null = null;
  private walletUnsub: (() => void) | null = null;

  constructor() {
    super("ResultScene");
  }

  preload(): void {
    preloadLandingBackdrop(this);
    preloadResultPanelAssets(this);
  }

  create(data: {
    result: DuelResult;
    duelId?: string | null;
    apiBaseUrl?: string;
    mode?: "standard" | "daily";
    archetype?: string;
    brainMode?: "tee" | "dummy";
    scoreOptions?: { dailyStreakDays?: number; surpriseStreak?: number };
    challengeMeta?: ChallengeMeta;
  }): void {
    this.result = data.result;
    this.duelId = data.duelId ?? null;
    this.apiBaseUrl = data.apiBaseUrl ?? "";
    this.mode = data.mode ?? "standard";
    this.archetype = data.archetype;
    this.brainMode = data.brainMode;
    this.scoreOptions = data.scoreOptions ?? {};
    this.challengeMeta = data.challengeMeta;
    this.scoreSubmitted = false;
    this.verifyProof = undefined;
    trackMetric("duel_finished");

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0);
    drawScanlines(this, 98, 0.05);

    playDuelEndSfx(this.result.winner);
    playDuelEndVoice(this.result.winner);

    this.renderPanel();

    if (this.mode === "daily" && this.panelHandle) {
      void this.submitDailyScore(this.panelHandle.dailyLabel, this.duelId);
    }

    void this.trySubmitGlobalScore();

    if (this.duelId) {
      void this.loadVerifySummary(verifyApiUrl(this.duelId, this.apiBaseUrl));
    }

    this.localeUnsub = onLanguageChange(() => this.renderPanel());
    this.walletUnsub = onWalletChange(() => {
      this.renderPanel();
      void this.trySubmitGlobalScore();
      if (this.mode === "daily" && this.panelHandle) {
        void this.submitDailyScore(this.panelHandle.dailyLabel, this.duelId);
      }
    });
  }

  private buildStatsText(): string {
    const strings = t();
    const breakdown = buildScoreBreakdownFromResult(this.result, this.scoreOptions);
    const scoreBlock = formatScoreBreakdown(breakdown, strings, this.result.score);
    const challengeLine = this.buildChallengeCompareLine(strings);

    return [
      `${strings.rounds}: ${this.result.roundsPlayed}`,
      `${strings.timesRead}: ${this.result.timesRead}`,
      `${strings.finalBlindsight}: ${this.result.finalBlindsight}%`,
      "",
      scoreBlock,
      challengeLine ? `\n${challengeLine}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildChallengeCompareLine(strings: ReturnType<typeof t>): string | null {
    const meta = this.challengeMeta;
    if (!meta?.challengerScore || meta.challengerScore <= 0) return null;
    const name = meta.challengerName ?? "Challenger";
    if (this.result.score > meta.challengerScore) {
      return format(strings.challengeBeat, { name, score: meta.challengerScore });
    }
    if (this.result.score < meta.challengerScore) {
      return format(strings.challengeLost, { name, score: meta.challengerScore });
    }
    return format(strings.challengeTie, { name, score: meta.challengerScore });
  }

  private getShareOptions() {
    const seed =
      this.mode === "daily"
        ? createDailyDuel().seed!
        : `standard-${this.archetype ?? "reader"}`;
    return {
      seed,
      archetype: this.archetype,
      duelId: this.duelId,
      mode: this.mode,
      verifyProof: this.verifyProof,
      brainMode: this.brainMode,
    };
  }

  private renderPanel(): void {
    const { width, height } = this.scale;
    const strings = t();
    const prevVerifyText = this.panelHandle?.verifyLabel.text;
    this.panelHandle?.destroy();

    const winnerLabel =
      this.result.winner === "PLAYER"
        ? strings.youWin
        : this.result.winner === "ZEGON"
          ? strings.zegonWins
          : strings.draw;

    const winnerColor =
      this.result.winner === "PLAYER" ? COLORS.verified : COLORS.ember;

    const wallet = getWalletAddress();
    const buttons: Array<{ label: string; primary?: boolean; onClick: () => void }> = [];

    if (!wallet) {
      buttons.push({
        label: strings.connectWalletRanking,
        primary: true,
        onClick: () => gameBridge.requestWalletConnect(),
      });
    } else if (!hasNickname(wallet)) {
      buttons.push({
        label: strings.profileSetupTitle,
        primary: true,
        onClick: () =>
          gameBridge.requestProfileSetup({
            address: wallet,
            required: true,
            onReady: () => void this.trySubmitGlobalScore(),
          }),
      });
    }

    buttons.push(
      {
        label: strings.verifyOnChain,
        onClick: () => {
          if (this.duelId) {
            openVerifyDuelWindow(this.duelId);
          } else {
            this.panelHandle?.setVerifyText(strings.verifyOffline);
          }
        },
      },
      {
        label: strings.shareOnX,
        onClick: () => {
          trackMetric("share_x");
          void shareOnX(this.result, this.getShareOptions());
        },
      },
      {
        label: strings.shareCard,
        onClick: () => {
          void generateShareCard(this.result, {
            archetype: this.archetype,
            brainMode: this.brainMode,
            verifyProof: this.verifyProof,
          });
        },
      },
      {
        label: strings.challengeLink,
        onClick: () => {
          void buildChallengeUrlFromResult(this.result, this.getShareOptions()).then((url) => {
            void navigator.clipboard?.writeText(url);
            this.panelHandle?.dailyLabel
              .setAlpha(1)
              .setText(strings.copiedChallenge)
              .setColor(COLORS.cyan);
          });
        },
      },
      {
        label: strings.menu,
        onClick: () => {
          this.scene.stop("ResultScene");
          gameBridge.navigate({ type: "hub" });
        },
      },
    );

    const brainTag =
      this.brainMode === "tee" ? "0G TEE" : this.brainMode === "dummy" ? "0G API" : "";

    this.panelHandle = createHubResultPanel(this, width / 2, height / 2, {
      winnerLabel,
      winnerColor,
      statsText: this.buildStatsText(),
      verifyPlaceholder: brainTag || strings.verifyPending,
      walletHint: !wallet ? strings.connectWalletRankingBody : undefined,
      buttons,
    });

    if (prevVerifyText && prevVerifyText !== (brainTag || strings.verifyPending)) {
      this.panelHandle.setVerifyText(prevVerifyText);
    }
  }

  shutdown(): void {
    stopAllVoice();
    this.localeUnsub?.();
    this.walletUnsub?.();
    this.localeUnsub = null;
    this.walletUnsub = null;
    this.panelHandle?.destroy();
    this.panelHandle = null;
  }

  private async trySubmitGlobalScore(): Promise<void> {
    if (this.scoreSubmitted || this.mode === "daily") return;

    const strings = t();
    const address = getWalletAddress();

    if (!address) {
      return;
    }
    if (!hasNickname(address)) {
      this.panelHandle?.dailyLabel
        .setAlpha(1)
        .setText(strings.globalScoreSubmitProfile)
        .setColor(COLORS.dust);
      return;
    }
    if (!this.duelId) {
      this.panelHandle?.dailyLabel
        .setAlpha(1)
        .setText(strings.globalScoreSubmitNoDuel)
        .setColor(COLORS.dust);
      return;
    }

    this.panelHandle?.dailyLabel
      .setAlpha(1)
      .setText(strings.globalScoreSubmitting)
      .setColor(COLORS.dust);

    let onChainOk = false;
    if (isLeaderboardContractConfigured()) {
      const res = await submitScoreOnChain(this.result.score, this.duelId);
      if (res.ok) {
        onChainOk = true;
        this.scoreSubmitted = true;
        this.panelHandle?.dailyLabel
          .setText(strings.globalScoreSubmitted)
          .setColor(COLORS.cyan);
        playSfx("verify_success");
      }
      // On-chain failures fall back to the API submit below.
    }

    const nickname = getCachedProfile(address)?.nickname;
    try {
      const res = await fetch("/api/global/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: address,
          score: this.result.score,
          duelId: this.duelId ?? undefined,
          nickname,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { accepted?: boolean };
      if (body.accepted) {
        this.scoreSubmitted = true;
        if (!onChainOk) {
          this.panelHandle?.dailyLabel
            .setText(strings.globalScoreSubmittedApi)
            .setColor(COLORS.cyan);
          playSfx("verify_success");
        }
      } else if (!onChainOk) {
        this.panelHandle?.dailyLabel
          .setText(strings.globalScoreSubmitFailed)
          .setColor(COLORS.ember);
      }
    } catch {
      if (!onChainOk) {
        this.panelHandle?.dailyLabel
          .setText(strings.globalScoreSubmitFailed)
          .setColor(COLORS.ember);
      }
    }
  }

  private async submitDailyScore(
    label: Phaser.GameObjects.Text,
    duelId?: string | null,
  ): Promise<void> {
    const strings = t();
    const address = getWalletAddress();
    if (!address) {
      label.setAlpha(1).setText(strings.scoreSubmitNoWallet);
      return;
    }

    if (!getCachedProfile(address)?.nickname) {
      label.setAlpha(1).setText(strings.scoreSubmitNoProfile);
      return;
    }

    const daily = createDailyDuel();
    try {
      const res = await fetch("/api/daily/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: address,
          score: this.result.score,
          seed: daily.seed,
          duelId: duelId ?? undefined,
          won: this.result.winner === DuelWinner.PLAYER,
          timesRead: this.result.timesRead,
          xpGain: xpForResult(this.result),
        }),
      });
      const body = (await res.json()) as { accepted?: boolean; reason?: string };
      label.setAlpha(1);
      if (res.ok && body.accepted !== false) {
        label.setText(strings.scoreSubmitted).setColor(COLORS.cyan);
      } else if (body.reason === "PROFILE_REQUIRED") {
        label.setText(strings.scoreSubmitNoProfile);
      } else if (body.reason === "DAILY_ALREADY_SUBMITTED") {
        label.setText(strings.dailyAlreadySubmitted);
      } else if (body.reason === "DUEL_NOT_VERIFIED") {
        label.setText(strings.duelNotVerified);
      }
    } catch {
      label.setAlpha(1).setText(strings.leaderboardEmpty);
    }
  }

  private async loadVerifySummary(url: string): Promise<void> {
    const strings = t();
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as VerifyResponse;
      const proofCount = data.rounds.filter((r) => r.commitBeforePlayer).length;
      const total = data.rounds.length;
      this.verifyProof = `${proofCount}/${total}`;
      const status = data.verified ? strings.verifyOk : strings.verifyPending;
      const tee = data.teeVerified ? " · 0G TEE ✓" : "";
      if (data.verified) {
        playSfx("verify_success");
        void this.trySubmitGlobalScore();
      }
      this.panelHandle?.setVerifyText(
        `${status}${tee}\n${strings.verifyRounds}: ${proofCount}/${total}`,
      );
    } catch {
      this.panelHandle?.setVerifyText(strings.verifyPending);
    }
  }
}

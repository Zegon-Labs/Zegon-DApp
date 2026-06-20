import Phaser from "phaser";
import { createDailyDuel, DuelWinner, xpForResult, type DuelResult } from "@zegon/game-core";
import { format, t } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { getCachedProfile } from "../services/profile.js";
import { getWalletAddress } from "../services/wallet.js";
import {
  createHubResultPanel,
  createLandingBackdrop,
  preloadLandingBackdrop,
} from "../ui/hub/index.js";
import { drawScanlines } from "../ui/components.js";
import { C, COLORS } from "../ui/theme.js";
import { buildChallengeUrlFromResult, generateShareCard } from "../utils/shareCard.js";
import { playDuelEndSfx, playSfx } from "../services/sfx.js";

interface VerifyResponse {
  duelId: string;
  verified: boolean;
  teeVerified?: boolean;
  rounds: Array<{ commitBeforePlayer: boolean }>;
}

export class ResultScene extends Phaser.Scene {
  private panelHandle: ReturnType<typeof createHubResultPanel> | null = null;

  constructor() {
    super("ResultScene");
  }

  preload(): void {
    preloadLandingBackdrop(this);
  }

  create(data: {
    result: DuelResult;
    duelId?: string | null;
    apiBaseUrl?: string;
    mode?: "standard" | "daily";
    archetype?: string;
    brainMode?: "tee" | "dummy";
  }): void {
    this.panelHandle?.destroy();
    this.panelHandle = null;

    const { width, height } = this.scale;
    const result = data.result;
    const strings = t();
    const duelId = data.duelId;
    const apiBase = data.apiBaseUrl ?? "";
    const mode = data.mode ?? "standard";

    this.cameras.main.setBackgroundColor(C.void);
    createLandingBackdrop(this, 0);
    drawScanlines(this, 98, 0.05);

    const winnerLabel =
      result.winner === "PLAYER"
        ? strings.youWin
        : result.winner === "ZEGON"
          ? strings.zegonWins
          : strings.draw;

    const winnerColor =
      result.winner === "PLAYER" ? COLORS.verified : COLORS.ember;

    playDuelEndSfx(result.winner);

    const statsText = [
      `${strings.rounds}: ${result.roundsPlayed}`,
      `${strings.timesRead}: ${result.timesRead}`,
      `${strings.finalBlindsight}: ${result.finalBlindsight}%`,
      `${strings.score}: ${result.score}`,
    ].join("\n");

    const brainTag =
      data.brainMode === "tee" ? "0G TEE" : data.brainMode === "dummy" ? "0G API" : "";

    this.panelHandle = createHubResultPanel(this, width / 2, height / 2, {
      winnerLabel,
      winnerColor,
      statsText,
      verifyPlaceholder: brainTag || strings.verifyPending,
      buttons: [
        {
          label: strings.verifyOnChain,
          onClick: () => {
            if (duelId) {
              window.open(
                `/verify.html?duel=${encodeURIComponent(duelId)}`,
                "zegon-verify",
              );
            } else {
              this.panelHandle?.setVerifyText(strings.verifyOffline);
            }
          },
        },
        {
          label: strings.share,
          onClick: () => {
            const text = format(strings.shareText, {
              score: result.score,
              timesRead: result.timesRead,
            });
            void navigator.clipboard?.writeText(text);
          },
        },
        {
          label: strings.shareCard,
          onClick: () => {
            void generateShareCard(result, {
              archetype: data.archetype,
              brainMode: data.brainMode,
            });
          },
        },
        {
          label: strings.challengeLink,
          onClick: () => {
            const seed =
              mode === "daily"
                ? createDailyDuel().seed!
                : `standard-${data.archetype ?? "reader"}`;
            const url = buildChallengeUrlFromResult(seed, data.archetype);
            void navigator.clipboard?.writeText(url);
          },
        },
        {
          label: strings.menu,
          onClick: () => {
            this.scene.stop("ResultScene");
            gameBridge.navigate({ type: "hub" });
          },
        },
      ],
    });

    if (mode === "daily") {
      void this.submitDailyScore(result, this.panelHandle.dailyLabel, duelId);
    }

    if (duelId) {
      void this.loadVerifySummary(`${apiBase}/api/duel/verify/${duelId}`);
    }
  }

  shutdown(): void {
    this.panelHandle?.destroy();
    this.panelHandle = null;
  }

  private async submitDailyScore(
    result: DuelResult,
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
          score: result.score,
          seed: daily.seed,
          duelId: duelId ?? undefined,
          won: result.winner === DuelWinner.PLAYER,
          timesRead: result.timesRead,
          xpGain: xpForResult(result),
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
      const status = data.verified ? strings.verifyOk : strings.verifyPending;
      const tee = data.teeVerified ? " · 0G TEE ✓" : "";
      if (data.verified) playSfx("verify_success");
      this.panelHandle?.setVerifyText(
        `${status}${tee}\n${strings.verifyRounds}: ${proofCount}/${total}`,
      );
    } catch {
      this.panelHandle?.setVerifyText(strings.verifyPending);
    }
  }
}

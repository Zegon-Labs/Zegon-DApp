import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { notify } from "../lib/toast.js";
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
  truncateAddress,
} from "../services/wallet.js";
import { fetchProfile, getCachedProfile, hasNickname, onProfileChange } from "../services/profile.js";
import { isTutorialDone } from "../tutorial/steps.js";
import { getDailyArchetype, getMsUntilDailyReset, formatDailyCountdown, resolveChallengeFromSearch, buildTwitterIntentUrl, type ChallengeMeta, type ChallengePayload, type DuelConfig } from "@zegon/game-core";
import { format, type LocaleStrings } from "../i18n/index.js";
import {
  checkDailyEntered,
  DailyStakeError,
  enterDailyPool,
  fetchDailyPool,
  type DailyStakeErrorCode,
} from "../services/dailyStake.js";
import { fetchHealth } from "../services/health.js";
import { playSfx } from "../services/sfx.js";
import { HeroCharacter } from "./HeroCharacter.js";
import { DailyStakeModal } from "./DailyStakeModal.js";
import { ScoreInfoModal } from "./ScoreInfoModal.js";

const STAKE_ERROR_KEYS: Record<DailyStakeErrorCode, keyof LocaleStrings> = {
  NO_WALLET: "stakeErrNoWallet",
  WRONG_NETWORK: "stakeErrWrongNetwork",
  INSUFFICIENT_BALANCE: "stakeErrInsufficient",
  USER_REJECTED: "stakeErrRejected",
  ALREADY_ENTERED: "stakeErrAlready",
  POOL_CLOSED: "stakeErrClosed",
  POOL_NOT_CONFIGURED: "stakeErrNotConfigured",
  TX_FAILED: "stakeErrFailed",
};

interface HeroHubProps {
  onNeedsProfile?: (address: string) => void;
}

function WalletIcon() {
  return (
    <svg className="btn__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H3V7Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.5" cy="14" r="1.25" fill="currentColor" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function HeroHub({ onNeedsProfile }: HeroHubProps) {
  const { strings, language: lang } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [poolInfo, setPoolInfo] = useState<Awaited<ReturnType<typeof fetchDailyPool>> | null>(null);
  const [staked, setStaked] = useState(false);
  const [brainLabel, setBrainLabel] = useState("…");
  const [countdown, setCountdown] = useState(formatDailyCountdown(getMsUntilDailyReset()));
  const [dailyTop, setDailyTop] = useState<Array<{ displayName?: string; playerId: string; score: number }>>([]);
  const [pendingChallenge, setPendingChallenge] = useState<{
    config: DuelConfig;
    meta: ChallengeMeta;
  } | null>(null);
  const [wins, setWins] = useState(0);
  const [duelsPlayed, setDuelsPlayed] = useState(0);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const dailyArch = getDailyArchetype();
  const dailyArchName = lang === "es" ? dailyArch.nameEs : dailyArch.nameEn;

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    void fetchDailyPool().then(setPoolInfo);
    void fetchHealth().then((h) => {
      setBrainLabel(h.brainMode === "tee" ? "0G TEE" : "Dummy Brain");
    });
    void fetch("/api/daily/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { entries?: Array<{ playerId: string; score: number; displayName?: string }> } | null) => {
        setDailyTop((data?.entries ?? []).slice(0, 3));
      })
      .catch(() => undefined);

    void (async () => {
      const parsed = await resolveChallengeFromSearch(
        window.location.search,
        async (id) => {
          try {
            const res = await fetch(`/api/challenge/${id}`);
            if (!res.ok) return null;
            const data = (await res.json()) as { payload?: ChallengePayload | null };
            return data.payload ?? null;
          } catch {
            return null;
          }
        },
      );
      if (parsed?.meta.challengerScore) {
        setPendingChallenge(parsed);
      }
    })();
  }, []);

  useEffect(() => {
    const tick = () => setCountdown(formatDailyCountdown(getMsUntilDailyReset()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!wallet || !poolInfo?.seed) return;
    void checkDailyEntered(poolInfo.seed, wallet).then(setStaked);
  }, [wallet, poolInfo?.seed]);

  useEffect(() => {
    function syncStats(address: string | null) {
      const profile = address ? getCachedProfile(address) : null;
      setWins(profile?.stats?.duelsWon ?? 0);
      setDuelsPlayed(profile?.stats?.duelsPlayed ?? 0);
    }
    syncStats(wallet);
    if (wallet) void fetchProfile(wallet).then(() => syncStats(wallet));
    return onProfileChange((address) => {
      if (address === wallet) syncStats(wallet);
    });
  }, [wallet]);

  const tutorialDone = isTutorialDone();
  const tutorialLabel = tutorialDone
    ? `${strings.tutorial} ${strings.tutorialDoneBadge}`
    : strings.tutorial;


  async function handleConnectWallet() {
    if (!hasEthereumProvider()) {
      notify.error(strings.walletNoProvider);
      return;
    }
    try {
      const address = await connectWallet();
      notify.success(strings.walletConnected, truncateAddress(address));
      if (!hasNickname(address)) {
        const remote = await fetchProfile(address);
        if (!remote?.nickname) onNeedsProfile?.(address);
      }
    } catch {
      notify.error(strings.walletNoProvider);
    }
  }

  function handleDisconnectWallet() {
    void disconnectWallet();
    notify.info(strings.disconnectWallet);
  }

  const poolConfigured = poolInfo?.configured === true;
  const needsWallet = !wallet;
  const canStake = poolConfigured && !staked;

  function openStakeModal() {
    playSfx("ui_modal_open");
    setShowStakeModal(true);
  }

  async function handleStakeDaily() {
    if (!poolInfo?.poolAddress) {
      notify.error(strings.stakeErrNotConfigured);
      return;
    }
    if (!wallet) {
      notify.info(strings.dailyWalletRequired);
      return;
    }
    try {
      const min = poolInfo.minStake ?? "0.01";
      const tx = await enterDailyPool(poolInfo.poolAddress, poolInfo.seed, min);
      setStaked(true);
      playSfx("daily_stake");
      notify.success(strings.dailyStaked, tx.slice(0, 10) + "…");
      setShowStakeModal(false);
      void fetchDailyPool().then(setPoolInfo);
    } catch (err) {
      const code: DailyStakeErrorCode =
        err instanceof DailyStakeError ? err.code : "TX_FAILED";
      notify.error(strings[STAKE_ERROR_KEYS[code]]);
      if (code !== "USER_REJECTED") {
        // keep modal open so they can adjust network/balance and retry
      }
    }
  }

  function startDaily() {
    setShowStakeModal(false);
    gameBridge.startScene("DuelScene", { mode: "daily" });
  }

  function startStandardDuel() {
    gameBridge.startScene("DuelScene", { mode: "standard", archetypeId: "reader" });
  }

  function acceptChallenge() {
    if (!pendingChallenge) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("c");
    url.searchParams.delete("challenge");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    gameBridge.startScene("DuelScene", {
      mode: "standard",
      archetypeId: (pendingChallenge.config.archetype as "reader") ?? "reader",
      challengeConfig: pendingChallenge.config,
      challengeMeta: pendingChallenge.meta,
    });
    setPendingChallenge(null);
  }

  function dismissChallenge() {
    const url = new URL(window.location.href);
    url.searchParams.delete("c");
    url.searchParams.delete("challenge");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    setPendingChallenge(null);
  }

  function shareDailyDraw() {
    const url = `${window.location.origin}/`;
    const text = `Today's ZEGON Daily Blind Draw is live on 0G. Can you outdraw the blind?\n\n@Zegon_0g`;
    window.open(buildTwitterIntentUrl(text, url), "_blank", "noopener,noreferrer,width=550,height=420");
  }

  const challengeName = pendingChallenge?.meta.challengerName ?? "Someone";
  const challengeScore = pendingChallenge?.meta.challengerScore ?? 0;

  return (
    <main className="hero">
      <div className="hero__scene" aria-hidden="true">
        <div className="hero__bg">
          <img src="/landing/bg.png" alt="" className="hero__bg-img" />
        </div>
        <div className="hero__scene-fog" aria-hidden="true" />
        <div className="hero__vignette" />
        <div className="hero__floor-fade" aria-hidden="true" />
      </div>
      <div className="hero__atmosphere" aria-hidden="true" />

      <div className="hero__layout">
        <HeroCharacter />

        <section className="hero__menu" aria-label="Menú principal">
          <div className="hero__menu-head">
            <h1 className="hero__logo" onDragStart={(e) => e.preventDefault()}>
              <img
                src="/landing/logo.png"
                alt="ZEGON"
                className="hero__logo-img"
                draggable={false}
              />
            </h1>
            <p className="hero__tagline" aria-label={strings.heroTagline}>
              {strings.heroTagline.split(". ").map((part, index, parts) => (
                <span
                  key={index}
                  className={`hero__tagline-line hero__tagline-line--${index % 2 === 0 ? "a" : "b"}`}
                >
                  {part}
                  {index < parts.length - 1 ? "." : ""}
                </span>
              ))}
            </p>
            <p className="hero__brain-badge">{brainLabel}</p>
          </div>

          <div className="hero__actions">
          {pendingChallenge && challengeScore > 0 && (
            <div className="challenge-banner" role="status">
              <p className="challenge-banner__text">
                {format(strings.challengeBanner, { name: challengeName, score: challengeScore })}
              </p>
              <div className="challenge-banner__actions">
                <button
                  type="button"
                  className="btn btn--menu challenge-banner__accept"
                  onClick={acceptChallenge}
                >
                  {strings.challengeAccept}
                </button>
                <button
                  type="button"
                  className="btn btn--menu challenge-banner__dismiss"
                  onClick={dismissChallenge}
                >
                  {strings.challengeDismiss}
                </button>
              </div>
            </div>
          )}

          {!tutorialDone && (
            <p className="hero__tutorial-callout" role="status">
              {strings.heroTutorialFirst}
            </p>
          )}

          <button
            type="button"
            className={`btn btn--primary${tutorialDone ? "" : " btn--primary-muted"}`}
            onClick={startStandardDuel}
          >
            <span className="btn__title">{strings.duel}</span>
            <span className="btn__subtitle">{strings.heroPlaySubtitle}</span>
          </button>

          <div className="daily-card">
            <p className="daily-card__title">{strings.dailyBlindDraw}</p>
            <p className="daily-card__meta">
              {dailyArchName} · {strings.dailyPoolLabel}{" "}
              {poolInfo?.totalStaked ?? "0"} OG · {poolInfo?.entrants ?? 0}{" "}
              {strings.dailyEntrants}
            </p>
            <p className="daily-card__countdown">
              {strings.dailyCountdownLabel} <strong>{countdown}</strong> UTC
            </p>
            {dailyTop.length > 0 && (
              <div className="daily-card__top">
                <p className="daily-card__top-title">{strings.dailyTopScores}</p>
                <ul>
                  {dailyTop.map((entry, i) => (
                    <li key={`${entry.playerId}-${i}`}>
                      #{i + 1} {entry.displayName ?? entry.playerId.slice(0, 8)} · {entry.score}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canStake && (
              <button
                type="button"
                className="btn btn--secondary btn--stake btn--stake-emphasis"
                onClick={openStakeModal}
              >
                {strings.dailyEnterPool} ({poolInfo?.minStake ?? "0.01"} OG)
              </button>
            )}
            {staked && <p className="daily-card__staked">{strings.dailyPrizeEligible}</p>}
            {needsWallet && (
              <p className="daily-card__hint" role="status">
                {strings.dailyPlayFreeRank}
              </p>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--daily-play btn--stake-emphasis"
              onClick={startDaily}
            >
              <span>{strings.dailyPlay}</span>
            </button>
            <div className="daily-card__links">
              <button
                type="button"
                className="daily-card__link-btn"
                onClick={() => {
                  playSfx("ui_modal_open");
                  setShowScoreInfo(true);
                }}
              >
                {strings.scoreInfoOpen}
              </button>
              <button
                type="button"
                className="daily-card__link-btn"
                onClick={shareDailyDraw}
              >
                {strings.dailyShareToday}
              </button>
            </div>
          </div>

          <div className="hero__divider" role="separator">
            <span>{strings.heroOr}</span>
          </div>

          {wallet ? (
            <div className="hero__wallet-connected">
              <div className="hero__wallet-row">
                <span className="hero__wallet-address">
                  <WalletIcon />
                  {truncateAddress(wallet)}
                </span>
                <button
                  type="button"
                  className="hero__wallet-disconnect"
                  onClick={handleDisconnectWallet}
                  aria-label={strings.disconnectWallet}
                  title={strings.disconnectWallet}
                >
                  <DisconnectIcon />
                </button>
              </div>
              {duelsPlayed > 0 && (
                <p className="hero__wallet-stats">
                  {format(strings.winsVsZegon, { wins, played: duelsPlayed })}
                </p>
              )}
            </div>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={() => void handleConnectWallet()}>
              <WalletIcon />
              <span>{strings.connectWallet}</span>
            </button>
          )}

          <div className="hero__menu-grid">
            <button
              type="button"
              className={`btn btn--menu${tutorialDone ? "" : " btn--menu-emphasis"}`}
              onClick={() => gameBridge.startScene("TutorialScene")}
            >
              {tutorialLabel}
            </button>
            <button
              type="button"
              className="btn btn--menu"
              onClick={() => gameBridge.navigate({ type: "achievements" })}
            >
              {strings.achievementsMenu}
            </button>
            <button
              type="button"
              className="btn btn--menu"
              onClick={() => gameBridge.navigate({ type: "leaderboard" })}
            >
              {strings.leaderboard}
            </button>
            <button
              type="button"
              className="hero__settings-gear"
              aria-label={strings.settings}
              title={strings.settings}
              onClick={() => gameBridge.navigate({ type: "settings" })}
            >
              {"\u2699"}
            </button>
          </div>

          <p className="hero__guest-note">
            <LockIcon />
            {strings.heroGuestNote}
          </p>
        </div>
        </section>
      </div>

      <footer className="hero__footer">
        <div className="hero__footer-built">
          <span className="hero__footer-line" aria-hidden="true" />
          <span className="hero__footer-label">{strings.heroBuiltOn}</span>
          <span className="hero__footer-og">
            <span className="hero__footer-og-glow" aria-hidden="true" />
            <span className="hero__footer-og-text">0G</span>
          </span>
          <span className="hero__footer-line" aria-hidden="true" />
        </div>

        <div className="hero__footer-features">
          <div className="footer-feature footer-feature--compute">
            <span className="footer-feature__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <p className="footer-feature__title">{strings.footerComputeTitle}</p>
            <p className="footer-feature__desc">{strings.footerComputeDesc}</p>
          </div>
          <div className="footer-feature footer-feature--chain">
            <span className="footer-feature__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3 4 7v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V7l-8-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="footer-feature__title">{strings.footerChainTitle}</p>
            <p className="footer-feature__desc">{strings.footerChainDesc}</p>
          </div>
          <div className="footer-feature footer-feature--storage">
            <span className="footer-feature__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4.5 5.5V12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4.5 12v6.5c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <p className="footer-feature__title">{strings.footerStorageTitle}</p>
            <p className="footer-feature__desc">{strings.footerStorageDesc}</p>
          </div>
        </div>
      </footer>

      {showStakeModal && poolInfo && (
        <DailyStakeModal
          pool={poolInfo}
          walletConnected={!needsWallet}
          onClose={() => {
            playSfx("ui_modal_close");
            setShowStakeModal(false);
          }}
          onStake={handleStakeDaily}
          onPlayFree={startDaily}
        />
      )}

      {showScoreInfo && (
        <ScoreInfoModal
          onClose={() => {
            playSfx("ui_modal_close");
            setShowScoreInfo(false);
          }}
        />
      )}
    </main>
  );
}

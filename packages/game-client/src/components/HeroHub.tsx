import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { trackMetric } from "../services/metrics.js";
import { HeroCharacter } from "./HeroCharacter.js";
import { NotchBalance } from "./NotchCoin.js";
import { DailyStakeModal } from "./DailyStakeModal.js";
import { ScoreInfoModal } from "./ScoreInfoModal.js";
import { ArchetypePickerModal } from "./ArchetypePickerModal.js";
import { DUEL_LENGTH_PRESETS } from "@zegon/game-core";
import type { DuelLengthId, ZegonArchetypeId } from "@zegon/game-core";

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
  const [showArchetypePicker, setShowArchetypePicker] = useState(false);
  const [seasonClaimable, setSeasonClaimable] = useState(false);
  const hubLayoutRef = useRef<HTMLDivElement>(null);
  const hubMenuRef = useRef<HTMLElement>(null);

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
    if (!wallet) {
      setSeasonClaimable(false);
      return;
    }
    void fetch("/api/season/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { claimable?: boolean } | null) => setSeasonClaimable(Boolean(data?.claimable)))
      .catch(() => setSeasonClaimable(false));
  }, [wallet]);

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


  async function handleConnectWallet() {
    if (!hasEthereumProvider()) {
      notify.error(strings.walletNoProvider);
      return;
    }
    try {
      const address = await connectWallet();
      trackMetric("connect_wallet");
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
    trackMetric("stake_click");
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
      trackMetric("stake_success");
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
    trackMetric("daily_start");
    setShowStakeModal(false);
    gameBridge.startScene("DuelScene", { mode: "daily" });
  }

  function startStandardDuel() {
    playSfx("ui_modal_open");
    setShowArchetypePicker(true);
  }

  function launchDuel(archetypeId: ZegonArchetypeId, duelLength: DuelLengthId) {
    setShowArchetypePicker(false);
    gameBridge.startScene("DuelScene", {
      mode: "standard",
      archetypeId,
      tiebreakRounds: DUEL_LENGTH_PRESETS[duelLength],
    });
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

  useLayoutEffect(() => {
    const layout = hubLayoutRef.current;
    const menu = hubMenuRef.current;
    const hero = layout?.closest(".hero");
    if (!layout || !menu || !(hero instanceof HTMLElement)) return;

    const desktopMq = window.matchMedia("(min-width: 901px)");

    const applyHubFit = () => {
      menu.style.removeProperty("--menu-fit-scale");
      menu.classList.remove("hero__menu--compact");
      hero.style.removeProperty("--hero-char-max-h");

      const available = layout.clientHeight;
      if (available > 0) {
        hero.style.setProperty("--hero-char-max-h", `${Math.max(available - 12, 240)}px`);
      }

      if (!desktopMq.matches) return;

      menu.style.setProperty("--menu-fit-scale", "1");
      const needed = menu.getBoundingClientRect().height;
      if (available <= 0 || needed <= 0) return;

      const scale = Math.min(1, (available / needed) * 0.98);
      menu.style.setProperty("--menu-fit-scale", scale.toFixed(3));
      if (scale < 0.88) {
        menu.classList.add("hero__menu--compact");
      }
    };

    const observer = new ResizeObserver(() => applyHubFit());
    observer.observe(layout);
    observer.observe(menu);

    const onViewportChange = () => applyHubFit();
    desktopMq.addEventListener("change", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    applyHubFit();

    return () => {
      observer.disconnect();
      desktopMq.removeEventListener("change", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
  }, []);

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

      <div className="hero__layout" ref={hubLayoutRef}>
        <HeroCharacter />

        <div className="hero__menu-fit">
        <section className="hero__menu" ref={hubMenuRef} aria-label="Menú principal">
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
            <div className="challenge-banner challenge-banner--card" role="status">
              <p className="challenge-banner__title">
                {format(strings.challengeCardTitle, { name: challengeName })}
              </p>
              <p className="challenge-banner__text">
                {format(strings.challengeBanner, { name: challengeName, score: challengeScore })}
              </p>
              {pendingChallenge.meta.challengerTimesRead != null &&
                pendingChallenge.meta.challengerRounds != null && (
                  <p className="challenge-banner__stats">
                    {format(strings.challengeStats, {
                      reads: pendingChallenge.meta.challengerTimesRead,
                      rounds: pendingChallenge.meta.challengerRounds,
                    })}
                  </p>
                )}
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

          <button
            type="button"
            className={`btn btn--primary${tutorialDone ? "" : " btn--primary-muted"}`}
            onClick={startStandardDuel}
          >
            <span className="btn__title">{strings.duel}</span>
            <span className="btn__subtitle">{strings.heroPlaySubtitle}</span>
          </button>

          <div className="daily-feature">
            <div className="daily-feature__head">
              <span className="daily-feature__icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12c0-4.2 3.6-8 9-8s9 3.8 9 8-3.6 8-9 8-9-3.8-9-8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 12h18M12 4c-2.2 2.4-3.5 5.6-3.5 8s1.3 5.6 3.5 8M12 4c2.2 2.4 3.5 5.6 3.5 8s-1.3 5.6-3.5 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="daily-feature__copy">
                <p className="daily-feature__title">{strings.dailyBlindDraw}</p>
                <p className="daily-feature__meta">
                  {dailyArchName} · {strings.dailyPoolLabel}{" "}
                  {poolInfo?.totalStaked ?? "0"} OG · {poolInfo?.entrants ?? 0}{" "}
                  {strings.dailyEntrants}
                </p>
              </div>
            </div>
            <p className="daily-feature__countdown">
              {strings.dailyCountdownLabel} <strong>{countdown}</strong> UTC
            </p>
            {dailyTop.length > 0 && (
              <div className="daily-feature__top">
                <p className="daily-feature__top-title">{strings.dailyTopScores}</p>
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
                className="btn btn--secondary btn--stake btn--stake-emphasis daily-feature__action"
                onClick={openStakeModal}
              >
                {strings.dailyEnterPool} ({poolInfo?.minStake ?? "0.01"} OG)
              </button>
            )}
            {staked && <p className="daily-feature__staked">{strings.dailyPrizeEligible}</p>}
            {needsWallet && (
              <p className="daily-feature__hint" role="status">
                {strings.dailyPlayFreeRank}
              </p>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--daily-play btn--stake-emphasis daily-feature__action"
              onClick={startDaily}
            >
              <span>{strings.dailyPlay}</span>
            </button>
            <div className="daily-feature__links">
              <button
                type="button"
                className="daily-feature__link-btn"
                onClick={() => {
                  playSfx("ui_modal_open");
                  setShowScoreInfo(true);
                }}
              >
                {strings.scoreInfoOpen}
              </button>
              <button
                type="button"
                className="daily-feature__link-btn"
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

          <button
            type="button"
            className="saloon-feature"
            onClick={() => {
              playSfx("ui_modal_open");
              gameBridge.navigate({ type: "saloon" });
            }}
          >
            <span className="saloon-feature__icon" aria-hidden="true">
              ⚒
            </span>
            <span className="saloon-feature__copy">
              <span className="saloon-feature__title">{strings.saloonMenu}</span>
              <span className="saloon-feature__subtitle">{strings.saloonTitle}</span>
            </span>
            {wallet && (
              <NotchBalance
                amount={getCachedProfile(wallet)?.notches ?? 0}
                size="sm"
                showLabel={false}
                className="saloon-feature__cta"
                compact
              />
            )}
          </button>

          <button
            type="button"
            className={`tutorial-hub-btn${tutorialDone ? " tutorial-hub-btn--done" : " tutorial-hub-btn--pending"}`}
            onClick={() => {
              playSfx("ui_modal_open");
              gameBridge.startScene("TutorialScene");
            }}
          >
            <span className="tutorial-hub-btn__icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a2 2 0 0 1 2 2v11.8a.7.7 0 0 1-1.12.56L12 15.5l-5.88 2.86A.7.7 0 0 1 5 17.8V6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M8 8h8M8 11.5h5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tutorial-hub-btn__copy">
              <span className="tutorial-hub-btn__title">{strings.tutorial}</span>
              <span className="tutorial-hub-btn__subtitle">
                {tutorialDone ? strings.tutorialDoneBadge : strings.heroTutorialFirst}
              </span>
            </span>
            {!tutorialDone && (
              <span className="tutorial-hub-btn__pill">{strings.tutorialContinue}</span>
            )}
          </button>

          <div className="hero__menu-grid">
            <button
              type="button"
              className="hub-nav-btn hub-nav-btn--profile"
              onClick={() => gameBridge.navigate({ type: "profile" })}
            >
              <span className="hub-nav-btn__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="hub-nav-btn__title">{strings.profileMenu}</span>
            </button>
            <button
              type="button"
              className="hub-nav-btn hub-nav-btn--achievements"
              onClick={() => gameBridge.navigate({ type: "achievements" })}
            >
              <span className="hub-nav-btn__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 4h8l1 4 4 2-1.5 4L16 18H8L4.5 14 3 10l4-2 1-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 18v2h6v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="hub-nav-btn__title">{strings.achievementsMenu}</span>
            </button>
            <button
              type="button"
              className="hub-nav-btn hub-nav-btn--ranking"
              onClick={() => gameBridge.navigate({ type: "leaderboard" })}
            >
              <span className="hub-nav-btn__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 20V10M12 20V4M19 20v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="hub-nav-btn__title">{strings.leaderboard}</span>
            </button>
            {seasonClaimable ? (
              <button
                type="button"
                className="hub-nav-btn hub-nav-btn--season"
                onClick={() => notify.info(strings.seasonClaimable)}
              >
                <span className="hub-nav-btn__icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3 4 7v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V7l-8-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="hub-nav-btn__title">{strings.seasonClaim}</span>
              </button>
            ) : (
              <button
                type="button"
                className="hub-nav-btn hub-nav-btn--settings"
                aria-label={strings.settings}
                title={strings.settings}
                onClick={() => gameBridge.navigate({ type: "settings" })}
              >
                <span className="hub-nav-btn__icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="hub-nav-btn__title">{strings.settings}</span>
              </button>
            )}
          </div>

          <p className="hero__guest-note">
            <LockIcon />
            {strings.heroGuestNote}
          </p>
        </div>
        </section>
        </div>
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

      {showArchetypePicker && (
        <ArchetypePickerModal
          onConfirm={launchDuel}
          onClose={() => {
            playSfx("ui_modal_close");
            setShowArchetypePicker(false);
          }}
        />
      )}
    </main>
  );
}

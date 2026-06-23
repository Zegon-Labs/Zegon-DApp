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
import { fetchProfile, hasNickname } from "../services/profile.js";
import { isTutorialDone } from "../tutorial/steps.js";
import { getDailyArchetype } from "@zegon/game-core";
import {
  checkDailyEntered,
  enterDailyPool,
  fetchDailyPool,
} from "../services/dailyStake.js";
import { fetchHealth } from "../services/health.js";
import { playSfx } from "../services/sfx.js";
import { HeroCharacter } from "./HeroCharacter.js";

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

  const dailyArch = getDailyArchetype();
  const dailyArchName = lang === "es" ? dailyArch.nameEs : dailyArch.nameEn;

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    void fetchDailyPool().then(setPoolInfo);
    void fetchHealth().then((h) => {
      setBrainLabel(h.brainMode === "tee" ? "0G TEE" : "Dummy Brain");
    });
  }, []);

  useEffect(() => {
    if (!wallet || !poolInfo?.seed) return;
    void checkDailyEntered(poolInfo.seed, wallet).then(setStaked);
  }, [wallet, poolInfo?.seed]);

  const tutorialDone = isTutorialDone();
  const tutorialLabel = tutorialDone
    ? `${strings.tutorial} ${strings.tutorialDoneBadge}`
    : strings.tutorial;


  async function handleWallet() {
    if (wallet) {
      disconnectWallet();
      notify.info(strings.disconnectWallet);
      return;
    }
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

  const poolConfigured = poolInfo?.configured === true;
  const needsWallet = !wallet;
  const needsStake = poolConfigured && !staked;
  const canPlayDaily = !needsWallet && !needsStake;

  async function handleStakeDaily() {
    if (!wallet) {
      notify.info(strings.dailyWalletRequired);
      return;
    }
    if (!poolInfo?.poolAddress) {
      notify.error(strings.dailyPoolNotConfigured);
      return;
    }
    try {
      const min = poolInfo.minStake ?? "0.01";
      const tx = await enterDailyPool(poolInfo.poolAddress, poolInfo.seed, min);
      setStaked(true);
      playSfx("daily_stake");
      notify.success(strings.dailyStaked, tx.slice(0, 10) + "…");
      void fetchDailyPool().then(setPoolInfo);
    } catch {
      notify.error(strings.dailyStakeFailed);
    }
  }

  async function startDaily() {
    if (needsWallet) {
      notify.info(strings.dailyWalletRequired);
      return;
    }

    if (needsStake) {
      notify.info(strings.dailyStakeRequired);
      return;
    }

    gameBridge.startScene("DuelScene", { mode: "daily" });
  }

  function startStandardDuel() {
    gameBridge.startScene("DuelScene", { mode: "standard", archetypeId: "reader" });
  }

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
            <p className="daily-card__title">{strings.daily}</p>
            <p className="daily-card__meta">
              {dailyArchName} · {strings.dailyPoolLabel}{" "}
              {poolInfo?.totalStaked ?? "0"} OG · {poolInfo?.entrants ?? 0}{" "}
              {strings.dailyEntrants}
            </p>
            {poolConfigured && !staked && (
              <button
                type="button"
                className={`btn btn--secondary btn--stake${needsWallet ? " btn--secondary-locked" : " btn--stake-emphasis"}`}
                onClick={() => void handleStakeDaily()}
              >
                {strings.dailyStake} ({poolInfo?.minStake ?? "0.01"} OG)
              </button>
            )}
            {staked && <p className="daily-card__staked">{strings.dailyStakedBadge}</p>}
            {!canPlayDaily && (
              <p className="daily-card__hint" role="status">
                {needsWallet ? strings.dailyWalletRequired : strings.dailyStakeFirst}
              </p>
            )}
            <button
              type="button"
              className={`btn btn--secondary btn--daily-play${canPlayDaily ? "" : " btn--secondary-locked"}`}
              onClick={() => void startDaily()}
              disabled={!canPlayDaily}
              aria-disabled={!canPlayDaily}
            >
              <span>{strings.dailyPlay}</span>
            </button>
          </div>

          <div className="hero__divider" role="separator">
            <span>{strings.heroOr}</span>
          </div>

          <button type="button" className="btn btn--secondary" onClick={() => void handleWallet()}>
            <WalletIcon />
            <span>{wallet ? truncateAddress(wallet) : strings.connectWallet}</span>
          </button>

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
    </main>
  );
}

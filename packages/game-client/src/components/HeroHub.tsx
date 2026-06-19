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
import { isTutorialDone } from "../tutorial/steps.js";

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

export function HeroHub() {
  const { strings } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());

  useEffect(() => onWalletChange(setWallet), []);

  const tutorialLabel = isTutorialDone()
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
    } catch {
      notify.error(strings.walletNoProvider);
    }
  }

  return (
    <main className="hero">
      <div className="hero__bg" aria-hidden="true">
        <img src="/landing/bg.png" alt="" className="hero__bg-img" />
      </div>
      <div className="hero__vignette" aria-hidden="true" />

      <div className="hero__character" aria-hidden="true">
        <div className="smoke-layer smoke-layer--1" aria-hidden="true" />
        <div className="smoke-layer smoke-layer--2" aria-hidden="true" />
        <div className="smoke-layer smoke-layer--3" aria-hidden="true" />
        <img src="/landing/character.png" alt="" className="hero__character-img" />
      </div>

      <div className="hero__content">
        <h1 className="hero__logo">
          <img src="/landing/logo.png" alt="ZEGON" className="hero__logo-img" />
        </h1>

        <p className="hero__tagline">{strings.heroTagline}</p>

        <div className="hero__actions">
          <button
            type="button"
            className="btn btn--primary btn--tutorial"
            onClick={() => gameBridge.startScene("TutorialScene")}
          >
            <span className="btn__title">{tutorialLabel}</span>
            <span className="btn__subtitle">{strings.tutorialTitle}</span>
          </button>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => gameBridge.startScene("DuelScene", { mode: "standard" })}
          >
            <span className="btn__title">{strings.duel}</span>
            <span className="btn__subtitle">{strings.heroPlaySubtitle}</span>
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: 10 }}
            onClick={() => gameBridge.startScene("DuelScene", { mode: "daily" })}
          >
            <span>{strings.daily}</span>
          </button>

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
              className="btn btn--menu"
              onClick={() => gameBridge.navigate({ type: "leaderboard" })}
            >
              {strings.leaderboard}
            </button>
            <button
              type="button"
              className="btn btn--menu"
              onClick={() => gameBridge.navigate({ type: "settings" })}
            >
              {strings.settings}
            </button>
          </div>
        </div>

        <p className="hero__verify-copy">
          {strings.heroVerifyLine1}
          <br />
          {strings.heroVerifyLine2a}
          <span className="text-accent">{strings.heroVerifyLine2b}</span>.
        </p>

        <button
          type="button"
          className="hero__verify-link"
          onClick={() => window.open("/verify.html", "_blank")}
        >
          {strings.hubVerifyLink}
        </button>

        <p className="hero__guest-note">
          <LockIcon />
          {strings.heroGuestNote}
        </p>
      </div>

      <footer className="hero__footer">
        <div className="hero__footer-built">
          <span className="hero__footer-line" aria-hidden="true" />
          <span className="hero__footer-label">{strings.heroBuiltOn}</span>
          <span className="hero__footer-og">0G</span>
          <span className="hero__footer-line" aria-hidden="true" />
        </div>

        <div className="hero__footer-features">
          <div className="footer-feature">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="footer-feature__title">{strings.footerComputeTitle}</p>
            <p className="footer-feature__desc">{strings.footerComputeDesc}</p>
          </div>
          <div className="footer-feature">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3 4 7v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V7l-8-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <p className="footer-feature__title">{strings.footerChainTitle}</p>
            <p className="footer-feature__desc">{strings.footerChainDesc}</p>
          </div>
          <div className="footer-feature">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4.5 5.5V12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4.5 12v6.5c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="footer-feature__title">{strings.footerStorageTitle}</p>
            <p className="footer-feature__desc">{strings.footerStorageDesc}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

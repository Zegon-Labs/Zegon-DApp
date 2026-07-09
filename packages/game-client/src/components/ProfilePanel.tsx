import { useEffect, useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  GUNSLINGER_RANKS,
  canRequestManualGunslingerEval,
  gunslingerPortraitPath,
  gunslingerRankName,
  gunslingerUnlockHint,
  type CharacterGender,
} from "@zegon/game-core";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { notify } from "../lib/toast.js";
import {
  fetchProfile,
  getCachedProfile,
  onProfileChange,
  saveProfile,
  validateNickname,
  xpProgress,
} from "../services/profile.js";
import { evaluateGunslinger, mintGunslingerNft, setGunslingerGender } from "../services/gunslinger.js";
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
  truncateAddress,
} from "../services/wallet.js";

export function ProfilePanel() {
  const { strings, language: lang } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [, tick] = useState(0);
  const [evalBusy, setEvalBusy] = useState(false);
  const [mintBusy, setMintBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [nickname, setNickname] = useState("");
  const [nickBusy, setNickBusy] = useState(false);

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    if (!wallet) {
      setNickname("");
      return;
    }
    const cached = getCachedProfile(wallet);
    if (cached) setNickname(cached.nickname);
    void fetchProfile(wallet).then((p) => {
      if (p) setNickname(p.nickname);
      tick((n) => n + 1);
    });
    return onProfileChange((addr) => {
      if (addr === wallet) {
        void fetchProfile(wallet).then((p) => {
          if (p) setNickname(p.nickname);
          tick((n) => n + 1);
        });
      }
    });
  }, [wallet]);

  const profile = wallet ? getCachedProfile(wallet) : null;
  const stats = profile?.stats;
  const xp = profile?.xp ?? 0;
  const prog = xpProgress(xp);
  const gs = profile?.gunslinger;
  const gender: CharacterGender = gs?.characterGender ?? "man";
  const currentRank = gs?.rank ?? 0;
  const evaluated = Boolean(gs?.evaluatedAt && currentRank > 0);

  const evalGate = useMemo(
    () =>
      canRequestManualGunslingerEval(stats?.duelsPlayed ?? 0, gs ?? null),
    [stats?.duelsPlayed, gs],
  );

  const portraitSrc = evaluated
    ? gunslingerPortraitPath(currentRank, gender)
    : gunslingerPortraitPath(1, gender);

  const nftNeedsUpdate =
    Boolean(gs?.nft) && (gs?.nft?.rankAtMint ?? 0) < currentRank;

  async function handleSaveNickname(): Promise<void> {
    if (!wallet || nickBusy) return;
    const check = validateNickname(nickname);
    if (!check.ok) {
      notify.error(check.key === "nicknameLength" ? strings.nicknameLength : strings.nicknameChars);
      return;
    }
    setNickBusy(true);
    try {
      await saveProfile(wallet, nickname);
      notify.success(strings.profileSaved);
      tick((n) => n + 1);
    } catch {
      notify.error(strings.profileSaveFailed);
    } finally {
      setNickBusy(false);
    }
  }

  async function handleConnect(): Promise<void> {
    if (!hasEthereumProvider()) {
      notify.error(strings.walletNoProvider);
      return;
    }
    try {
      await connectWallet();
      notify.success(strings.walletConnected);
    } catch {
      notify.error(strings.walletNoProvider);
    }
  }

  async function handleDisconnect(): Promise<void> {
    await disconnectWallet();
    notify.info(strings.disconnectWallet);
  }

  async function handleEvaluate(): Promise<void> {
    if (!wallet || evalBusy) return;
    setEvalBusy(true);
    setActionMsg("");
    const res = await evaluateGunslinger(wallet, lang, true);
    setEvalBusy(false);
    if (res.ok) {
      tick((n) => n + 1);
    } else if (res.reason === "NEED_DUELS") {
      setActionMsg(strings.gunslingerEvalNeedDuels);
    } else if (res.reason === "COOLDOWN") {
      setActionMsg(strings.gunslingerEvalCooldown);
    } else if (res.reason === "NEED_NEW_DUELS") {
      setActionMsg(strings.gunslingerEvalNeedNewDuels);
    }
  }

  async function handleGender(next: CharacterGender): Promise<void> {
    if (!wallet || next === gender) return;
    const res = await setGunslingerGender(wallet, next);
    if (res.ok) tick((n) => n + 1);
  }

  async function handleMint(): Promise<void> {
    if (!wallet || mintBusy || !evaluated) return;
    setMintBusy(true);
    setActionMsg("");
    const res = await mintGunslingerNft(wallet, lang);
    setMintBusy(false);
    if (res.ok && res.mint) {
      setActionMsg(strings.gunslingerMinted);
      tick((n) => n + 1);
    } else {
      setActionMsg(mintErrorMessage(res.reason, strings));
    }
  }

  function mintErrorMessage(
    reason: string | undefined,
    s: typeof strings,
  ): string {
    switch (reason) {
      case "CONTRACT_NOT_CONFIGURED":
        return s.gunslingerMintContractMissing;
      case "PORTRAIT_NOT_FOUND":
        return s.gunslingerMintPortraitMissing;
      case "STORAGE_UPLOAD_FAILED":
      case "PORTRAIT_UPLOAD_FAILED":
      case "METADATA_UPLOAD_FAILED":
        return s.gunslingerMintStorageFailed;
      case "GUNSLINGER_NOT_EVALUATED":
        return s.gunslingerEvalNeedDuels;
      case "SIWE_REQUIRED":
      case "SIWE_INVALID":
        return s.gunslingerMintFailed;
      default:
        return reason && reason !== "MINT_FAILED" && !reason.startsWith("HTTP_")
          ? `${s.gunslingerMintFailed} (${reason})`
          : s.gunslingerMintFailed;
    }
  }

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility">
        <h2 className="hero__panel-title">{strings.profileTitle}</h2>
        {!wallet ? (
          <div className="utility-panel-body">
            <p className="hero__verify-copy">{strings.settingsProfileNoWallet}</p>
            <button
              type="button"
              className="utility-sprite-button profile-account__connect"
              onClick={() => void handleConnect()}
            >
              {strings.connectWallet}
            </button>
          </div>
        ) : (
          <div className="utility-panel-body">
            <section className="profile-account" aria-label={strings.settingsSectionProfile}>
              <h3 className="profile-account__title">{strings.settingsSectionProfile}</h3>
              <p className="profile-account__wallet">
                {strings.settingsProfileWallet}: <code>{truncateAddress(wallet)}</code>
              </p>
              <label className="profile-account__label" htmlFor="profile-nick">
                {strings.nicknameLabel}
              </label>
              <input
                id="profile-nick"
                className="profile-account__input"
                value={nickname}
                maxLength={16}
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="profile-account__hint">{strings.nicknameHint}</p>
              <div className="profile-account__actions">
                <button
                  type="button"
                  className="utility-sprite-button profile-account__btn"
                  disabled={nickBusy}
                  onClick={() => void handleSaveNickname()}
                >
                  {strings.settingsEditNickname}
                </button>
                <button
                  type="button"
                  className="utility-sprite-button profile-account__btn profile-account__btn--ghost"
                  onClick={() => void handleDisconnect()}
                >
                  {strings.disconnectWallet}
                </button>
              </div>
            </section>

            {profile ? (
              <>
            <section className="gunslinger-section" aria-label={strings.gunslingerRankTitle}>
              <h3 className="gunslinger-section__title">{strings.gunslingerRankTitle}</h3>
              <div className="gunslinger-section__hero">
                <div className={`gunslinger-portrait${evaluated ? "" : " gunslinger-portrait--pending"}`}>
                  <img
                    src={portraitSrc}
                    alt={
                      evaluated
                        ? format(strings.gunslingerRankLabel, {
                            rank: currentRank,
                            name: gunslingerRankName(currentRank, lang),
                          })
                        : strings.gunslingerRankTitle
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.35";
                    }}
                  />
                </div>
                <div className="gunslinger-section__meta">
                  {evaluated ? (
                    <p className="gunslinger-rank-label">
                      {format(strings.gunslingerRankLabel, {
                        rank: currentRank,
                        name: gunslingerRankName(currentRank, lang),
                      })}
                    </p>
                  ) : null}
                  <p className="gunslinger-bio">
                    {gs?.bio?.trim() || strings.gunslingerBioPlaceholder}
                  </p>
                  <div className="gunslinger-gender-toggle" role="group" aria-label={strings.gunslingerRankTitle}>
                    <button
                      type="button"
                      className={`gunslinger-gender-btn${gender === "man" ? " gunslinger-gender-btn--active" : ""}`}
                      onClick={() => void handleGender("man")}
                    >
                      {strings.gunslingerGenderMan}
                    </button>
                    <button
                      type="button"
                      className={`gunslinger-gender-btn${gender === "woman" ? " gunslinger-gender-btn--active" : ""}`}
                      onClick={() => void handleGender("woman")}
                    >
                      {strings.gunslingerGenderWoman}
                    </button>
                  </div>
                </div>
              </div>

              <h4 className="gunslinger-rank-path__title">{strings.gunslingerRankPath}</h4>
              <p className="gunslinger-rank-path__hint">{strings.gunslingerRankPathHint}</p>
              <ol className="gunslinger-rank-ladder" aria-label={strings.gunslingerRankPath}>
                {GUNSLINGER_RANKS.map((def) => {
                  const isCurrent = evaluated && currentRank === def.rank;
                  const isAchieved = evaluated && currentRank > def.rank;
                  const isLocked = !evaluated || currentRank < def.rank;
                  const rankName = lang === "es" ? def.nameEs : def.nameEn;
                  const unlockHint = gunslingerUnlockHint(def.rank, lang, { evaluated });
                  return (
                    <li
                      key={def.rank}
                      className={[
                        "gunslinger-rank-step",
                        isCurrent ? " gunslinger-rank-step--current" : "",
                        isAchieved ? " gunslinger-rank-step--achieved" : "",
                        isLocked ? " gunslinger-rank-step--locked" : "",
                      ].join("")}
                      aria-current={isCurrent ? "step" : undefined}
                      title={isLocked ? unlockHint : undefined}
                    >
                      <div className="gunslinger-rank-step__portrait" aria-hidden="true">
                        <img
                          src={gunslingerPortraitPath(def.rank, gender)}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                      <span className="gunslinger-rank-step__num">{def.rank}</span>
                      <div className="gunslinger-rank-step__body">
                        <span className="gunslinger-rank-step__name">{rankName}</span>
                        {isLocked ? (
                          <>
                            <span className="gunslinger-rank-step__badge gunslinger-rank-step__badge--locked">
                              {strings.gunslingerRankLocked}
                            </span>
                            <span className="gunslinger-rank-step__hint">
                              {unlockHint}
                            </span>
                          </>
                        ) : isCurrent ? (
                          <span className="gunslinger-rank-step__badge">{strings.gunslingerRankCurrent}</span>
                        ) : (
                          <span className="gunslinger-rank-step__badge gunslinger-rank-step__badge--achieved">
                            {strings.gunslingerRankAchieved}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="gunslinger-actions">
                <button
                  type="button"
                  className="utility-sprite-button gunslinger-actions__btn"
                  disabled={evalBusy || !evalGate.ok}
                  onClick={() => void handleEvaluate()}
                >
                  {evalBusy ? strings.gunslingerEvaluating : strings.gunslingerEvaluate}
                </button>
                {evaluated ? (
                  <button
                    type="button"
                    className="utility-sprite-button gunslinger-actions__btn gunslinger-actions__btn--mint"
                    disabled={mintBusy || (Boolean(gs?.nft) && !nftNeedsUpdate)}
                    onClick={() => void handleMint()}
                  >
                    {mintBusy
                      ? strings.gunslingerMinting
                      : nftNeedsUpdate
                        ? strings.gunslingerUpdateNft
                        : gs?.nft
                          ? strings.gunslingerMinted
                          : strings.gunslingerMint}
                  </button>
                ) : null}
              </div>
              {!evalGate.ok && !evaluated ? (
                <p className="gunslinger-action-hint">
                  {evalGate.reason === "NEED_DUELS"
                    ? strings.gunslingerEvalNeedDuels
                    : evalGate.reason === "COOLDOWN"
                      ? strings.gunslingerEvalCooldown
                      : strings.gunslingerEvalNeedNewDuels}
                </p>
              ) : null}
              {actionMsg ? <p className="gunslinger-action-msg">{actionMsg}</p> : null}
              {gs?.nft?.txHash ? (
                <a
                  className="gunslinger-explorer-link"
                  href={`https://chainscan-galileo.0g.ai/tx/${gs.nft.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  0G Explorer
                </a>
              ) : null}
            </section>

            <p className="profile-hero-stat">
              {format(strings.profileReadStat, {
                read: stats?.timesReadTotal ?? 0,
                rounds: stats?.totalRoundsPlayed ?? stats?.duelsPlayed ?? 0,
              })}
            </p>
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-card__value">{stats?.duelsWon ?? 0}</span>
                <span className="profile-stat-card__label">{strings.profileStatWins}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-card__value">{stats?.duelsPlayed ?? 0}</span>
                <span className="profile-stat-card__label">{strings.profileStatDuels}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-card__value">{stats?.maxReadingStreak ?? 0}</span>
                <span className="profile-stat-card__label">{strings.profileStatStreak}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-card__value">
                  {Math.max(stats?.bestGlobalScore ?? 0, stats?.bestDailyScore ?? 0)}
                </span>
                <span className="profile-stat-card__label">{strings.score}</span>
              </div>
            </div>
            <div className="profile-xp-bar">
              <div className="profile-xp-bar__fill" style={{ width: `${prog.pct}%` }} />
              <span className="profile-xp-bar__label">
                {format(strings.profileLevel, { level: prog.level })} · {prog.current}/{prog.next} XP ·{" "}
                {format(strings.profileNotches, { n: profile.notches ?? 0 })}
              </span>
            </div>
            {profile.achievements && profile.achievements.length > 0 && (
              <ul className="profile-achievements">
                {profile.achievements.map((id) => {
                  const ach = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
                  if (!ach) return null;
                  return <li key={id}>{lang === "es" ? ach.nameEs : ach.nameEn}</li>;
                })}
              </ul>
            )}
              </>
            ) : (
              <p className="profile-account__setup">{strings.profileSaveNicknameFirst}</p>
            )}
          </div>
        )}
        <button
          type="button"
          className="utility-sprite-button hero__panel-back"
          onClick={() => gameBridge.navigate({ type: "hub" })}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

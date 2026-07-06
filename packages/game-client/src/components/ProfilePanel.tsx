import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@zegon/game-core";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import {
  fetchProfile,
  getCachedProfile,
  onProfileChange,
  xpProgress,
} from "../services/profile.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";

export function ProfilePanel() {
  const { strings, language: lang } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [, tick] = useState(0);

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    if (!wallet) return;
    void fetchProfile(wallet).then(() => tick((n) => n + 1));
    return onProfileChange((addr) => {
      if (addr === wallet) {
        void fetchProfile(wallet).then(() => tick((n) => n + 1));
      }
    });
  }, [wallet]);

  const profile = wallet ? getCachedProfile(wallet) : null;
  const stats = profile?.stats;
  const xp = profile?.xp ?? 0;
  const prog = xpProgress(xp);

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility">
        <h2 className="hero__panel-title">{strings.profileTitle}</h2>
        {!wallet || !profile ? (
          <p className="hero__verify-copy">{strings.settingsProfileNoWallet}</p>
        ) : (
          <div className="utility-panel-body">
            <p className="profile-hero-name">{profile.nickname}</p>
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

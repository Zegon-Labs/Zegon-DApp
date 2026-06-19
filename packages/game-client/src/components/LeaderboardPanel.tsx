import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";

interface LeaderboardEntry {
  playerId: string;
  nickname?: string;
  displayName?: string;
  score: number;
  timestamp: number;
}

function formatTime(ts: number, locale: string): string {
  try {
    return new Date(ts).toLocaleTimeString(locale === "es" ? "es" : "en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function LeaderboardPanel() {
  const { strings, language } = useLocale();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily/leaderboard");
        if (!res.ok) throw new Error("offline");
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const walletLower = wallet?.toLowerCase();

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide">
        <h2 className="hero__panel-title">{strings.leaderboardTitle}</h2>
        <p className="hero__verify-copy" style={{ marginTop: 0 }}>
          {strings.leaderboardSubtitle}
        </p>
        <p className="settings-hint" style={{ marginBottom: 14 }}>
          {strings.leaderboardWalletOnly}
        </p>

        <div className="leaderboard-table">
          <div className="leaderboard-table__head">
            <span>{strings.leaderboardColRank}</span>
            <span>{strings.leaderboardColPlayer}</span>
            <span>{strings.leaderboardColScore}</span>
          </div>

          {loading ? (
            <p className="hero__leaderboard-empty">…</p>
          ) : entries.length === 0 ? (
            <p className="hero__leaderboard-empty">{strings.leaderboardEmpty}</p>
          ) : (
            entries.map((e, i) => {
              const isYou = walletLower && e.playerId.toLowerCase() === walletLower;
              const name = e.displayName ?? e.nickname ?? e.playerId.slice(0, 10);
              return (
                <div
                  key={`${e.playerId}-${e.timestamp}`}
                  className={`leaderboard-table__row${isYou ? " leaderboard-table__row--you" : ""}`}
                >
                  <span>{i + 1}</span>
                  <span>
                    {name}
                    {isYou && (
                      <span className="leaderboard-table__you"> ({strings.leaderboardYou})</span>
                    )}
                    <span className="leaderboard-table__time">
                      {formatTime(e.timestamp, language)}
                    </span>
                  </span>
                  <span>{e.score}</span>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="btn btn--secondary hero__panel-back"
          onClick={() => gameBridge.navigate({ type: "hub" })}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

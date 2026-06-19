import { useEffect, useState } from "react";
import { format } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";

interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: number;
}

export function LeaderboardPanel() {
  const { strings } = useLocale();
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily/leaderboard");
        if (!res.ok) throw new Error("offline");
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        const entries = data.entries.slice(0, 10);

        if (cancelled) return;

        if (entries.length === 0) {
          setLines([strings.leaderboardEmpty]);
        } else {
          setLines(
            entries.map((e, i) =>
              format(strings.leaderboardRank, {
                rank: i + 1,
                id: `${e.playerId.slice(0, 6)}…${e.playerId.slice(-4)}`,
                score: e.score,
              }),
            ),
          );
        }
      } catch {
        if (!cancelled) setLines([strings.leaderboardEmpty]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [strings.leaderboardEmpty, strings.leaderboardRank]);

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel">
        <h2 className="hero__panel-title">{strings.leaderboardTitle}</h2>
        <div className="hero__leaderboard-list">
          {loading ? (
            <p className="hero__leaderboard-empty">…</p>
          ) : lines.length === 0 || (lines.length === 1 && lines[0] === strings.leaderboardEmpty) ? (
            <p className="hero__leaderboard-empty">{lines[0] ?? strings.leaderboardEmpty}</p>
          ) : (
            lines.map((line) => <p key={line}>{line}</p>)
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

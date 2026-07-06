import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { fetchProfile } from "../services/profile.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";

type BoardId = "score" | "hunter" | "veteran" | "ghost" | "speed" | "verified";

interface BoardEntry {
  playerId: string;
  nickname?: string;
  displayName?: string;
  value: number;
  timestamp?: number;
}

const BOARDS: BoardId[] = ["score", "hunter", "veteran", "ghost", "speed", "verified"];

function boardLabel(id: BoardId, strings: ReturnType<typeof useLocale>["strings"]): string {
  const map: Record<BoardId, string> = {
    score: strings.boardScore,
    hunter: strings.boardHunter,
    veteran: strings.boardVeteran,
    ghost: strings.boardGhost,
    speed: strings.boardSpeed,
    verified: strings.boardVerified,
  };
  return map[id];
}

function formatValue(id: BoardId, value: number): string {
  if (id === "ghost") return `${(value * 100).toFixed(1)}%`;
  if (id === "speed") return `${(value / 1000).toFixed(1)}s`;
  return String(Math.round(value));
}

export function LeaderboardPanel() {
  const { strings } = useLocale();
  const [board, setBoard] = useState<BoardId>("score");
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [playerRank, setPlayerRank] = useState<{
    rank: number | null;
    total: number;
    value: number | null;
  } | null>(null);
  const [seasonDays, setSeasonDays] = useState(0);
  const [prizePool, setPrizePool] = useState("0");

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ board });
      if (wallet) params.set("address", wallet);
      try {
        const res = await fetch(`/api/global/leaderboard?${params}`);
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          entries: BoardEntry[];
          playerRank?: { rank: number | null; total: number; value: number | null };
          season?: { msRemaining: number; season: { prizePoolWei: string } };
        };
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setPlayerRank(data.playerRank ?? null);
        if (data.season) {
          setSeasonDays(Math.ceil(data.season.msRemaining / (24 * 60 * 60 * 1000)));
          const wei = BigInt(data.season.season.prizePoolWei || "0");
          setPrizePool((Number(wei) / 1e18).toFixed(2));
        }
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
  }, [board, wallet]);

  const walletLower = wallet?.toLowerCase();

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility">
        <h2 className="hero__panel-title">{strings.globalLeaderboardTitle}</h2>
        <p className="hero__verify-copy" style={{ marginTop: 0 }}>
          {format(strings.boardSeasonRemaining, { days: seasonDays })} ·{" "}
          {format(strings.boardPrizePool, { pool: prizePool })}
        </p>

        <div className="board-tabs">
          {BOARDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`board-tab${board === id ? " board-tab--active" : ""}`}
              onClick={() => setBoard(id)}
            >
              {boardLabel(id, strings)}
            </button>
          ))}
        </div>

        <div className="leaderboard-table">
          <div className="leaderboard-table__head">
            <span>{strings.leaderboardColRank}</span>
            <span>{strings.leaderboardColPlayer}</span>
            <span>{boardLabel(board, strings)}</span>
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
                <button
                  type="button"
                  key={`${e.playerId}-${i}`}
                  className={`leaderboard-table__row leaderboard-table__row--btn${isYou ? " leaderboard-table__row--you" : ""}`}
                  onClick={() => void fetchProfile(e.playerId)}
                >
                  <span>{i + 1}</span>
                  <span>
                    {name}
                    {isYou && (
                      <span className="leaderboard-table__you"> ({strings.leaderboardYou})</span>
                    )}
                  </span>
                  <span>{formatValue(board, e.value)}</span>
                </button>
              );
            })
          )}
        </div>

        {playerRank?.rank && (
          <p className="board-footer-rank">
            {format(strings.boardYourRank, {
              rank: playerRank.rank,
              pct: Math.max(1, Math.round((playerRank.rank / Math.max(playerRank.total, 1)) * 100)),
            })}
          </p>
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

import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format, type Language, type LocaleStrings } from "../i18n/index.js";
import { fetchLastDuelAuditForPlayer } from "../services/duelAudit.js";
import { fetchProfile } from "../services/profile.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";
import {
  padCountdownUnit,
  seasonCountdownFromMs,
} from "../utils/seasonCountdown.js";

type TournamentStatus = "upcoming" | "active" | "ended";

interface TournamentPhaseDto {
  id: string;
  nameEn: string;
  nameEs: string;
  startAt: number;
  endAt: number;
}

interface TournamentDto {
  status: TournamentStatus;
  phase: TournamentPhaseDto | null;
  msRemaining: number;
}

function phaseName(phase: TournamentPhaseDto | null, lang: Language): string {
  if (!phase) return "";
  return lang === "es" ? phase.nameEs : phase.nameEn;
}

function tournamentBannerTitle(
  tournament: TournamentDto | null,
  strings: LocaleStrings,
  lang: Language,
): string {
  if (!tournament) return strings.boardSeasonEndsIn;
  if (tournament.status === "ended") return strings.boardTournamentEnded;
  if (tournament.status === "upcoming") return strings.boardTournamentStartsIn;
  const name = phaseName(tournament.phase, lang);
  return name ? `${name} · ${strings.boardPhaseEndsIn}` : strings.boardSeasonEndsIn;
}

type BoardId = "score" | "hunter" | "veteran" | "ghost" | "speed" | "verified";

interface BoardEntry {
  playerId: string;
  nickname?: string;
  displayName?: string;
  value: number;
  timestamp?: number;
}

const BOARDS: BoardId[] = ["ghost", "score", "hunter", "veteran", "speed", "verified"];

function boardLabel(id: BoardId, strings: LocaleStrings): string {
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

function boardDescription(id: BoardId, strings: LocaleStrings): string {
  const map: Record<BoardId, string> = {
    score: strings.boardDescScore,
    hunter: strings.boardDescHunter,
    veteran: strings.boardDescVeteran,
    ghost: strings.boardDescGhost,
    speed: strings.boardDescSpeed,
    verified: strings.boardDescVerified,
  };
  return map[id];
}

function boardSortHint(id: BoardId, strings: LocaleStrings): string {
  return id === "speed" ? strings.boardLowerBetter : strings.boardHigherBetter;
}

function formatValue(id: BoardId, value: number): string {
  if (id === "speed") return `${(value / 1000).toFixed(1)}s`;
  return String(Math.round(value));
}

export function LeaderboardPanel() {
  const { strings, language: lang } = useLocale();
  const [board, setBoard] = useState<BoardId>("ghost");
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [playerRank, setPlayerRank] = useState<{
    rank: number | null;
    total: number;
    value: number | null;
  } | null>(null);
  const [seasonEndAt, setSeasonEndAt] = useState<number | null>(null);
  const [seasonMsRemaining, setSeasonMsRemaining] = useState(0);
  const [tournament, setTournament] = useState<TournamentDto | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<BoardEntry | null>(null);
  const [auditBusy, setAuditBusy] = useState(false);

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
          tournament?: TournamentDto;
        };
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setPlayerRank(data.playerRank ?? null);
        if (data.tournament) {
          setTournament(data.tournament);
          setSeasonEndAt(Date.now() + data.tournament.msRemaining);
          setSeasonMsRemaining(data.tournament.msRemaining);
        } else if (data.season) {
          setTournament(null);
          setSeasonEndAt(Date.now() + data.season.msRemaining);
          setSeasonMsRemaining(data.season.msRemaining);
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

  useEffect(() => {
    if (seasonEndAt === null) return;
    const tick = () => {
      setSeasonMsRemaining(Math.max(0, seasonEndAt - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [seasonEndAt]);

  async function openPlayerAudit(entry: BoardEntry) {
    setSelectedPlayer(entry);
  }

  async function viewLastDuelAudit() {
    if (!selectedPlayer || auditBusy) return;
    setAuditBusy(true);
    try {
      const { entry } = await fetchLastDuelAuditForPlayer(selectedPlayer.playerId);
      if (!entry?.storageRoot) {
        return;
      }
      gameBridge.navigate({
        type: "audit",
        storageRoot: entry.storageRoot,
        duelId: entry.duelId,
      });
    } finally {
      setAuditBusy(false);
    }
  }
  const walletLower = wallet?.toLowerCase();
  const activeLabel = boardLabel(board, strings);
  const countdown = seasonCountdownFromMs(seasonMsRemaining);
  const tournamentEnded = tournament?.status === "ended";
  const showCountdown =
    seasonEndAt !== null && countdown.totalMs > 0 && !tournamentEnded;
  const bannerTitle = tournamentBannerTitle(tournament, strings, lang);

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--utility hero__panel--leaderboard">
        <div className="leaderboard-panel__inner">
          <h2 className="hero__panel-title">{strings.globalLeaderboardTitle}</h2>
          <p className="board-intro">{strings.boardGlobalIntro}</p>
          <p className="board-how-to">{strings.boardGlobalHowTo}</p>

          <section className="board-season-banner" aria-live="polite">
            <p className="board-season-banner__title">
              {bannerTitle}
            </p>
            {showCountdown ? (
              <div className="season-countdown" role="timer">
                <div className="season-countdown__unit">
                  <span className="season-countdown__value">{countdown.days}</span>
                  <span className="season-countdown__label">{strings.boardSeasonUnitDays}</span>
                </div>
                <span className="season-countdown__sep" aria-hidden="true">:</span>
                <div className="season-countdown__unit">
                  <span className="season-countdown__value">{padCountdownUnit(countdown.hours)}</span>
                  <span className="season-countdown__label">{strings.boardSeasonUnitHours}</span>
                </div>
                <span className="season-countdown__sep" aria-hidden="true">:</span>
                <div className="season-countdown__unit">
                  <span className="season-countdown__value">{padCountdownUnit(countdown.minutes)}</span>
                  <span className="season-countdown__label">{strings.boardSeasonUnitMinutes}</span>
                </div>
                <span className="season-countdown__sep" aria-hidden="true">:</span>
                <div className="season-countdown__unit season-countdown__unit--seconds">
                  <span className="season-countdown__value">{padCountdownUnit(countdown.seconds)}</span>
                  <span className="season-countdown__label">{strings.boardSeasonUnitSeconds}</span>
                </div>
              </div>
            ) : null}
            <p className="board-season-banner__prize">
              {strings.boardSeasonPrizeExplain}
            </p>
          </section>

          <div className="board-tabs" role="tablist" aria-label={strings.globalLeaderboardTitle}>
            {BOARDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={board === id}
                className={`board-tab${board === id ? " board-tab--active" : ""}`}
                onClick={() => setBoard(id)}
              >
                {boardLabel(id, strings)}
              </button>
            ))}
          </div>

          <div className="board-desc" role="tabpanel">
            <p className="board-desc__title">
              {activeLabel}
              <span className="board-desc__hint">{boardSortHint(board, strings)}</span>
            </p>
            <p className="board-desc__body">{boardDescription(board, strings)}</p>
          </div>

          <div className="leaderboard-table">
            <div className="leaderboard-table__head">
              <span>{strings.leaderboardColRank}</span>
              <span>{strings.leaderboardColPlayer}</span>
              <span>{activeLabel}</span>
            </div>

            {loading ? (
              <p className="hero__leaderboard-empty">…</p>
            ) : entries.length === 0 ? (
              <div className="hero__leaderboard-empty hero__leaderboard-empty--block">
                <p>{strings.boardGlobalEmpty}</p>
                <p className="hero__leaderboard-empty__hint">{strings.boardGlobalEmptyHint}</p>
              </div>
            ) : (
              entries.map((e, i) => {
                const isYou = walletLower && e.playerId.toLowerCase() === walletLower;
                const name = e.displayName ?? e.nickname ?? e.playerId.slice(0, 10);
                return (
                  <button
                    type="button"
                    key={`${e.playerId}-${i}`}
                    className={`leaderboard-table__row leaderboard-table__row--btn${isYou ? " leaderboard-table__row--you" : ""}`}
                    onClick={() => void openPlayerAudit(e)}
                  >
                    <span className="leaderboard-table__rank">{i + 1}</span>
                    <span className="leaderboard-table__name">
                      {name}
                      {isYou && (
                        <span className="leaderboard-table__you"> ({strings.leaderboardYou})</span>
                      )}
                    </span>
                    <span className="leaderboard-table__value">{formatValue(board, e.value)}</span>
                  </button>
                );
              })
            )}
          </div>

          {wallet && playerRank?.rank ? (
            <p className="board-footer-rank">
              {format(strings.boardYourRank, {
                rank: playerRank.rank,
                pct: Math.max(1, Math.round((playerRank.rank / Math.max(playerRank.total, 1)) * 100)),
              })}
              {playerRank.value !== null &&
                ` · ${format(board === "ghost" ? strings.boardYourTotal : strings.boardYourStat, { value: formatValue(board, playerRank.value) })}`}
            </p>
          ) : wallet ? (
            <p className="board-footer-rank board-footer-rank--muted">{strings.boardNotRankedYet}</p>
          ) : null}

          {selectedPlayer ? (
            <div className="board-player-peek" role="region" aria-label={strings.boardPlayerPeekTitle}>
              <p className="board-player-peek__name">
                {selectedPlayer.displayName ?? selectedPlayer.nickname ?? selectedPlayer.playerId.slice(0, 10)}
              </p>
              <div className="board-player-peek__actions">
                <button
                  type="button"
                  className="btn btn--menu"
                  disabled={auditBusy}
                  onClick={() => void viewLastDuelAudit()}
                >
                  {strings.boardViewLastDuel}
                </button>
                <button
                  type="button"
                  className="btn btn--menu btn--ghost"
                  onClick={() => void fetchProfile(selectedPlayer.playerId)}
                >
                  {strings.boardViewProfile}
                </button>
                <button
                  type="button"
                  className="btn btn--menu btn--ghost"
                  onClick={() => setSelectedPlayer(null)}
                >
                  {strings.commonCancel}
                </button>
              </div>
            </div>
          ) : null}
        </div>

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

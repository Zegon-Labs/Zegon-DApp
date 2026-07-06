import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";

interface ReplayRound {
  roundIndex: number;
  predictedMove?: string;
  zegonMove?: string;
  playerAction?: string;
  taunt?: string;
  commitBeforePlayer?: boolean;
}

interface ReplayPanelProps {
  duelId: string;
  onClose: () => void;
}

export function ReplayPanel({ duelId, onClose }: ReplayPanelProps) {
  const { strings } = useLocale();
  const [rounds, setRounds] = useState<ReplayRound[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/duel/${duelId}/replay`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rounds?: ReplayRound[] } | null) => {
        setRounds(data?.rounds ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [duelId]);

  const round = rounds[index];

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility">
        <h2 className="hero__panel-title">{strings.replayTitle}</h2>
        {loading ? (
          <p className="hero__verify-copy">…</p>
        ) : rounds.length === 0 ? (
          <p className="hero__verify-copy">{strings.leaderboardEmpty}</p>
        ) : (
          <div className="utility-panel-body utility-panel-body--replay">
            <p className="profile-hero-stat">
              {format(strings.replayRound, { n: index + 1 })} / {rounds.length}
            </p>
            {round && (
              <div className="replay-round">
                {round.taunt && <p className="replay-round__taunt">{round.taunt}</p>}
                <p>
                  {format(strings.replayPredicted, {
                    move: round.predictedMove ?? "?",
                  })}
                </p>
                <p>
                  {format(strings.replayYouPlayed, {
                    move: round.playerAction ?? "—",
                  })}
                </p>
                <p>ZEGON: {round.zegonMove ?? "?"}</p>
                <p className={round.commitBeforePlayer ? "replay-sealed-ok" : "replay-sealed-bad"}>
                  {round.commitBeforePlayer ? "✓ Sealed first" : "✗ Order unclear"}
                </p>
              </div>
            )}
            <div className="replay-nav">
              <button
                type="button"
                className="btn btn--menu"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn--menu"
                disabled={index >= rounds.length - 1}
                onClick={() => setIndex((i) => Math.min(rounds.length - 1, i + 1))}
              >
                →
              </button>
            </div>
          </div>
        )}
        <button type="button" className="utility-sprite-button hero__panel-back" onClick={onClose}>
          {strings.back}
        </button>
      </div>
    </div>
  );
}

export function useReplayOverlay() {
  const [replayDuelId, setReplayDuelId] = useState<string | null>(null);

  useEffect(() => {
    return gameBridge.onOpenReplay((id) => setReplayDuelId(id));
  }, []);

  const overlay =
    replayDuelId !== null ? (
      <ReplayPanel duelId={replayDuelId} onClose={() => setReplayDuelId(null)} />
    ) : null;

  return { overlay };
}

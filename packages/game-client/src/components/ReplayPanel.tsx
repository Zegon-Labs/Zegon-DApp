import { useEffect, useState, type MouseEvent } from "react";
import { gameBridge, type ReplayRequest } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { getDuelSessionToken } from "../services/duelSessionStorage.js";
import {
  formatPlayerActionLabel,
  formatZegonActionLabel,
} from "../utils/actionLabels.js";

export interface ReplayRound {
  roundIndex: number;
  predictedMove?: string;
  zegonMove?: string;
  playerAction?: string;
  itemUsed?: string;
  predictionCorrect?: boolean;
  taunt?: string;
  commitBeforePlayer?: boolean;
}

interface ReplayPanelProps {
  request: ReplayRequest;
  onClose: () => void;
}

function mapApiRound(raw: Record<string, unknown>): ReplayRound {
  return {
    roundIndex: Number(raw.roundIndex ?? 0),
    predictedMove: raw.predictedMove as string | undefined,
    zegonMove: raw.zegonMove as string | undefined,
    playerAction: raw.playerAction as string | undefined,
    itemUsed: raw.itemUsed as string | undefined,
    predictionCorrect: raw.predictionCorrect as boolean | undefined,
    taunt: raw.taunt as string | undefined,
    commitBeforePlayer: raw.commitBeforePlayer as boolean | undefined,
  };
}

function stopClickThrough(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function ReplayPanel({ request, onClose }: ReplayPanelProps) {
  const { strings, language: lang } = useLocale();
  const [rounds, setRounds] = useState<ReplayRound[]>(
    request.kind === "local" ? request.rounds : [],
  );
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(request.kind === "api");

  useEffect(() => {
    if (request.kind === "local") {
      setRounds(request.rounds);
      setIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const token = getDuelSessionToken(request.duelId);
    const replayUrl = token
      ? `/api/duel/${request.duelId}/replay?token=${encodeURIComponent(token)}`
      : `/api/duel/${request.duelId}/replay`;
    void fetch(replayUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rounds?: Record<string, unknown>[] } | null) => {
        setRounds((data?.rounds ?? []).map(mapApiRound));
        setIndex(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [request]);

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    stopClickThrough(e);
    document.body.classList.add("zegon-replay-closing");
    onClose();
    window.setTimeout(() => {
      document.body.classList.remove("zegon-replay-closing");
    }, 220);
  };

  const round = rounds[index];

  return (
    <div
      className="hero__overlay hero__overlay--game hero__overlay--replay"
      role="dialog"
      aria-modal="true"
      onClick={stopClickThrough}
      onMouseDown={stopClickThrough}
    >
      <div
        className="hero__panel hero__panel--wide hero__panel--utility hero__panel--replay"
        onClick={stopClickThrough}
        onMouseDown={stopClickThrough}
      >
        <h2 className="hero__panel-title">{strings.replayTitle}</h2>

        {loading ? (
          <p className="hero__verify-copy replay-panel__status">…</p>
        ) : rounds.length === 0 ? (
          <p className="hero__verify-copy replay-panel__status">{strings.replayEmpty}</p>
        ) : (
          <div className="replay-panel__body">
            <p className="replay-panel__round">
              {format(strings.replayRound, { n: index + 1 })} / {rounds.length}
            </p>

            {round && (
              <div className="replay-round">
                {round.taunt ? (
                  <p className="replay-round__taunt">{round.taunt}</p>
                ) : null}
                <p className="replay-round__line">
                  {format(strings.replayPredicted, {
                    move: formatPlayerActionLabel(round.predictedMove, lang),
                  })}
                </p>
                <p className="replay-round__line replay-round__line--you">
                  {format(strings.replayYouPlayed, {
                    move: formatPlayerActionLabel(
                      round.playerAction,
                      lang,
                      round.itemUsed,
                    ),
                  })}
                </p>
                <p className="replay-round__line">
                  {format(strings.replayZegonPlayed, {
                    move: formatZegonActionLabel(round.zegonMove, lang),
                  })}
                </p>
                {round.predictionCorrect != null ? (
                  <p
                    className={
                      round.predictionCorrect
                        ? "replay-round__read replay-round__read--yes"
                        : "replay-round__read replay-round__read--no"
                    }
                  >
                    {round.predictionCorrect
                      ? strings.replayReadCorrect
                      : strings.replayReadWrong}
                  </p>
                ) : null}
                {request.kind === "api" && round.commitBeforePlayer != null ? (
                  <p
                    className={
                      round.commitBeforePlayer ? "replay-sealed-ok" : "replay-sealed-bad"
                    }
                  >
                    {round.commitBeforePlayer
                      ? strings.replaySealedOk
                      : strings.replaySealedBad}
                  </p>
                ) : null}
              </div>
            )}

            <div className="replay-nav">
              <button
                type="button"
                className="btn btn--menu"
                disabled={index <= 0}
                onClick={(e) => {
                  stopClickThrough(e);
                  setIndex((i) => Math.max(0, i - 1));
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn--menu"
                disabled={index >= rounds.length - 1}
                onClick={(e) => {
                  stopClickThrough(e);
                  setIndex((i) => Math.min(rounds.length - 1, i + 1));
                }}
              >
                →
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="utility-sprite-button hero__panel-back"
          onClick={handleClose}
          onMouseDown={stopClickThrough}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

export function useReplayOverlay() {
  const [replayRequest, setReplayRequest] = useState<ReplayRequest | null>(null);

  useEffect(() => {
    return gameBridge.onOpenReplay((request) => setReplayRequest(request));
  }, []);

  useEffect(() => {
    if (replayRequest) {
      document.body.classList.add("zegon-replay-open");
      return () => {
        window.setTimeout(() => {
          document.body.classList.remove("zegon-replay-open");
        }, 220);
      };
    }
    return undefined;
  }, [replayRequest]);

  const overlay =
    replayRequest !== null ? (
      <ReplayPanel request={replayRequest} onClose={() => setReplayRequest(null)} />
    ) : null;

  return { overlay };
}

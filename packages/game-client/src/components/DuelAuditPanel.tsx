import { useEffect, useState } from "react";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { loadDuelAudit } from "../services/duelAudit.js";
import type { ParsedDuelAudit } from "@zegon/game-core";

interface DuelAuditPanelProps {
  storageRoot?: string;
  duelId?: string;
}

export function DuelAuditPanel({ storageRoot, duelId }: DuelAuditPanelProps) {
  const { strings } = useLocale();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<ParsedDuelAudit | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storageRoot) {
      setLoading(false);
      setError(true);
      return;
    }
    let cancelled = false;
    void loadDuelAudit(storageRoot, duelId).then((parsed) => {
      if (cancelled) return;
      setAudit(parsed);
      setError(!parsed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storageRoot, duelId]);

  const indexerUrl = storageRoot
    ? `https://indexer-storage-turbo.0g.ai/download?root=${encodeURIComponent(storageRoot)}`
    : undefined;

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--utility hero__panel--audit">
        <div className="audit-panel__inner">
          <h2 className="hero__panel-title">{strings.auditPanelTitle}</h2>
          <p className="audit-panel__intro">{strings.auditPanelIntro}</p>

          {storageRoot ? (
            <p className="audit-panel__root">
              <span className="audit-panel__label">{strings.auditRootLabel}</span>
              <code className="audit-panel__hash">{storageRoot}</code>
            </p>
          ) : null}

          {indexerUrl ? (
            <a
              className="hero__verify-link audit-panel__link"
              href={indexerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {strings.auditIndexerLink}
            </a>
          ) : null}

          {loading ? (
            <p className="hero__leaderboard-empty">…</p>
          ) : error || !audit ? (
            <p className="hero__leaderboard-empty">{strings.auditLoadFailed}</p>
          ) : (
            <>
              <p className="audit-panel__duel-id">
                {format(strings.auditDuelId, { id: audit.duelId })}
              </p>
              <div className="audit-round-list" role="list">
                {audit.rounds.map((row) => (
                  <article key={row.round} className="audit-round-row" role="listitem">
                    <h3 className="audit-round-row__title">
                      {format(strings.auditRoundTitle, { round: row.round })}
                    </h3>
                    <dl className="audit-round-row__grid">
                      {row.predictedMove ? (
                        <>
                          <dt>{strings.auditPredicted}</dt>
                          <dd>{row.predictedMove}</dd>
                        </>
                      ) : null}
                      {row.zegonReveal ? (
                        <>
                          <dt>{strings.auditZegonMove}</dt>
                          <dd>{row.zegonReveal}</dd>
                        </>
                      ) : null}
                      {row.playerAction ? (
                        <>
                          <dt>{strings.auditPlayerAction}</dt>
                          <dd>{row.playerAction}</dd>
                        </>
                      ) : null}
                      {row.itemUsed ? (
                        <>
                          <dt>{strings.auditItemUsed}</dt>
                          <dd>{row.itemUsed}</dd>
                        </>
                      ) : null}
                      {row.predictionCorrect != null ? (
                        <>
                          <dt>{strings.auditReadResult}</dt>
                          <dd>
                            {row.predictionCorrect
                              ? strings.auditReadYes
                              : strings.auditReadNo}
                          </dd>
                        </>
                      ) : null}
                      {row.zegonCommit ? (
                        <>
                          <dt>{strings.auditCommit}</dt>
                          <dd className="audit-round-row__mono">{row.zegonCommit}</dd>
                        </>
                      ) : null}
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
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

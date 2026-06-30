import { useState } from "react";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { playSfx } from "../services/sfx.js";
import { truncateAddress } from "../services/wallet.js";
import type { DailyPoolInfo } from "../services/dailyStake.js";
import { ScoringRulesList } from "./ScoreInfoModal.js";

const FAUCET_URL = "https://faucet.0g.ai";

interface DailyStakeModalProps {
  pool: DailyPoolInfo;
  walletConnected: boolean;
  onClose: () => void;
  onStake: () => Promise<void> | void;
  onPlayFree: () => void;
}

export function DailyStakeModal({
  pool,
  walletConnected,
  onClose,
  onStake,
  onPlayFree,
}: DailyStakeModalProps) {
  const { strings } = useLocale();
  const [busy, setBusy] = useState(false);
  const minStake = pool.minStake ?? "0.01";
  const rewards = pool.rankRewards ?? [
    { rank: 1, sharePercent: 40, label: "#1" },
    { rank: 2, sharePercent: 25, label: "#2" },
    { rank: 3, sharePercent: 15, label: "#3" },
    { rank: 4, sharePercent: 20, label: "#4–#10" },
  ];

  async function handleStake() {
    if (busy) return;
    setBusy(true);
    playSfx("ui_confirm");
    try {
      await onStake();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="hero__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stake-modal-title"
    >
      <div className="hero__panel hero__panel--wide stake-modal">
        <h2 className="hero__panel-title" id="stake-modal-title">
          {strings.stakeModalTitle}
        </h2>
        <p className="stake-modal__intro">{strings.stakeModalIntro}</p>

        <div className="stake-modal__stats">
          <div className="stake-modal__stat">
            <span className="stake-modal__stat-label">{strings.stakeModalMinLabel}</span>
            <span className="stake-modal__stat-value">{minStake} OG</span>
          </div>
          <div className="stake-modal__stat">
            <span className="stake-modal__stat-label">{strings.stakeModalPoolLabel}</span>
            <span className="stake-modal__stat-value">
              {pool.totalStaked ?? "0"} OG · {pool.entrants ?? 0} {strings.dailyEntrants}
            </span>
          </div>
          {pool.poolAddress && (
            <div className="stake-modal__stat">
              <span className="stake-modal__stat-label">{strings.stakeModalContractLabel}</span>
              <span className="stake-modal__stat-value stake-modal__mono">
                {truncateAddress(pool.poolAddress)}
              </span>
            </div>
          )}
        </div>

        <div className="stake-modal__section">
          <p className="stake-modal__section-title">{strings.stakeModalRewardsTitle}</p>
          <ul className="stake-modal__rewards">
            {rewards.map((r) => (
              <li key={r.rank}>
                {format(strings.stakeModalRewardSplit, {
                  label: r.label,
                  percent: r.sharePercent,
                })}
              </li>
            ))}
          </ul>
        </div>

        <div className="stake-modal__section">
          <p className="stake-modal__section-title">{strings.stakeModalReqTitle}</p>
          <ul className="stake-modal__reqs">
            <li>{strings.stakeModalReqNetwork}</li>
            <li>{strings.stakeModalReqBalance}</li>
            <li
              className={walletConnected ? "stake-modal__req--ok" : undefined}
            >
              {strings.stakeModalReqWallet}
            </li>
          </ul>
          <a
            className="stake-modal__faucet"
            href={FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {strings.stakeModalFaucet} →
          </a>
        </div>

        <ScoringRulesList />

        <div className="stake-modal__actions">
          <button
            type="button"
            className="btn btn--primary btn--stake-confirm"
            disabled={busy || !walletConnected}
            onClick={() => void handleStake()}
          >
            <span className="btn__title">
              {format(strings.stakeModalConfirm, { amount: minStake })}
            </span>
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              playSfx("ui_click");
              onPlayFree();
            }}
          >
            {strings.dailyPlayWithoutStake}
          </button>
          <button
            type="button"
            className="btn btn--menu stake-modal__cancel"
            onClick={() => {
              playSfx("ui_modal_close");
              onClose();
            }}
          >
            {strings.commonCancel}
          </button>
        </div>
      </div>
    </div>
  );
}

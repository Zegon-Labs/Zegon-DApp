import { useState } from "react";
import { useLocale } from "../hooks/useLocale.js";
import { playSfx } from "../services/sfx.js";

interface MatchStakeModalProps {
  minStake: string;
  poolAddress?: string;
  onClose: () => void;
  onStake: (amountEth: string) => Promise<void> | void;
  onPlayFree: () => void;
}

export function MatchStakeModal({
  minStake,
  poolAddress,
  onClose,
  onStake,
  onPlayFree,
}: MatchStakeModalProps) {
  const { strings } = useLocale();
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(minStake);

  async function handleStake() {
    if (busy) return;
    setBusy(true);
    playSfx("ui_confirm");
    try {
      await onStake(amount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide stake-modal">
        <h2 className="hero__panel-title">{strings.matchStakeTitle}</h2>
        <p className="stake-modal__intro">{strings.matchStakeIntro}</p>
        <p className="stake-modal__disclaimer">{strings.matchStakeDisclaimer}</p>

        <label className="stake-modal__stat">
          <span className="stake-modal__stat-label">{strings.matchStakeAmountLabel}</span>
          <input
            className="stake-modal__input"
            type="number"
            min={minStake}
            max="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {poolAddress ? (
          <p className="stake-modal__stat-value stake-modal__mono">{poolAddress}</p>
        ) : null}

        <div className="stake-modal__actions">
          <button type="button" className="btn btn--menu" disabled={busy} onClick={() => void handleStake()}>
            {strings.matchStakeConfirm}
          </button>
          <button type="button" className="btn btn--menu btn--ghost" onClick={onPlayFree}>
            {strings.matchStakePlayFree}
          </button>
          <button type="button" className="btn btn--menu btn--ghost" onClick={onClose}>
            {strings.commonCancel}
          </button>
        </div>
      </div>
    </div>
  );
}

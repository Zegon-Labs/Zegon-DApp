import { useState } from "react";
import type { DuelLengthId, ZegonArchetypeId } from "@zegon/game-core";
import { DUEL_LENGTH_PRESETS } from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";
import { playSfx } from "../services/sfx.js";
import { ArchetypeSelector } from "./ArchetypeSelector.js";

const LENGTH_STORAGE_KEY = "zegon.duelLength";

function loadStoredLength(): DuelLengthId {
  try {
    const raw = localStorage.getItem(LENGTH_STORAGE_KEY);
    if (raw && raw in DUEL_LENGTH_PRESETS) return raw as DuelLengthId;
  } catch {
    /* localStorage unavailable */
  }
  return "standard";
}

function storeLength(id: DuelLengthId): void {
  try {
    localStorage.setItem(LENGTH_STORAGE_KEY, id);
  } catch {
    /* localStorage unavailable */
  }
}

interface ArchetypePickerModalProps {
  onConfirm: (archetypeId: ZegonArchetypeId, duelLength: DuelLengthId) => void;
  onClose: () => void;
}

export function ArchetypePickerModal({ onConfirm, onClose }: ArchetypePickerModalProps) {
  const { strings } = useLocale();
  const [archetype, setArchetype] = useState<ZegonArchetypeId>("reader");
  const [duelLength, setDuelLength] = useState<DuelLengthId>(loadStoredLength);

  const lengthLabels: Record<DuelLengthId, string> = {
    quick: strings.duelLengthQuick,
    standard: strings.duelLengthStandard,
    long: strings.duelLengthLong,
  };

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true" aria-labelledby="archetype-picker-title">
      <div className="hero__panel hero__panel--wide hero__panel--utility hero__panel--archetype">
        <div className="archetype-picker__inner">
          <h2 id="archetype-picker-title" className="hero__panel-title">
            {strings.pickArchetype}
          </h2>
          <div className="utility-panel-body utility-panel-body--archetype">
            <ArchetypeSelector value={archetype} onChange={setArchetype} />
          </div>
          <div className="archetype-picker__footer">
            <div className="duel-length" role="radiogroup" aria-label={strings.duelLengthTitle}>
              <span className="duel-length__label">{strings.duelLengthTitle}</span>
              <div className="duel-length__options">
                {(Object.keys(DUEL_LENGTH_PRESETS) as DuelLengthId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={duelLength === id}
                    className={`duel-length__chip${duelLength === id ? " duel-length__chip--active" : ""}`}
                    onClick={() => {
                      playSfx("ui_select");
                      setDuelLength(id);
                      storeLength(id);
                    }}
                  >
                    <span className="duel-length__chip-name">{lengthLabels[id]}</span>
                    <span className="duel-length__chip-rounds">
                      {DUEL_LENGTH_PRESETS[id]} {strings.duelLengthRounds}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="archetype-picker__actions">
              <button
                type="button"
                className="btn btn--primary btn--archetype-duel"
                data-skip-ui-click
                onClick={() => {
                  playSfx("ui_confirm");
                  onConfirm(archetype, duelLength);
                }}
              >
                <span className="btn__title">{strings.duel}</span>
              </button>
              <button
                type="button"
                className="utility-sprite-button hero__panel-back"
                data-skip-ui-click
                onClick={() => {
                  playSfx("ui_modal_close");
                  onClose();
                }}
              >
                {strings.back}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

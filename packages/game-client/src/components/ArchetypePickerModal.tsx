import { useState } from "react";
import type { ZegonArchetypeId } from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";
import { playSfx } from "../services/sfx.js";
import { ArchetypeSelector } from "./ArchetypeSelector.js";

interface ArchetypePickerModalProps {
  onConfirm: (archetypeId: ZegonArchetypeId) => void;
  onClose: () => void;
}

export function ArchetypePickerModal({ onConfirm, onClose }: ArchetypePickerModalProps) {
  const { strings } = useLocale();
  const [archetype, setArchetype] = useState<ZegonArchetypeId>("reader");

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true" aria-labelledby="archetype-picker-title">
      <div className="hero__panel hero__panel--wide hero__panel--utility hero__panel--archetype">
        <h2 id="archetype-picker-title" className="hero__panel-title">
          {strings.pickArchetype}
        </h2>
        <div className="utility-panel-body">
          <ArchetypeSelector value={archetype} onChange={setArchetype} />
        </div>
        <div className="archetype-picker__actions">
          <button
            type="button"
            className="btn btn--primary btn--archetype-duel"
            data-skip-ui-click
            onClick={() => {
              playSfx("ui_confirm");
              onConfirm(archetype);
            }}
          >
            <span className="btn__title">{strings.duel}</span>
            <span className="btn__subtitle">{strings.heroPlaySubtitle}</span>
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
  );
}

import { useState } from "react";
import type { ZegonArchetypeId } from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";
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
      <div className="hero__panel hero__panel--wide">
        <h2 id="archetype-picker-title" className="hero__panel-title">
          {strings.pickArchetype}
        </h2>
        <ArchetypeSelector value={archetype} onChange={setArchetype} />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onConfirm(archetype)}
        >
          <span className="btn__title">{strings.duel}</span>
          <span className="btn__subtitle">{strings.heroPlaySubtitle}</span>
        </button>
        <button type="button" className="btn btn--secondary hero__panel-back" onClick={onClose}>
          {strings.back}
        </button>
      </div>
    </div>
  );
}

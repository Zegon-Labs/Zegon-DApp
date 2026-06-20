import {
  getAllArchetypes,
  type ZegonArchetypeId,
} from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";

interface ArchetypeSelectorProps {
  value: ZegonArchetypeId;
  onChange: (id: ZegonArchetypeId) => void;
}

export function ArchetypeSelector({ value, onChange }: ArchetypeSelectorProps) {
  const { language: lang } = useLocale();
  const archetypes = getAllArchetypes();

  return (
    <div className="archetype-grid">
      {archetypes.map((arch) => {
        const selected = value === arch.id;
        const name = lang === "es" ? arch.nameEs : arch.nameEn;
        const advantage = lang === "es" ? arch.advantageEs : arch.advantageEn;
        const tradeoff = lang === "es" ? arch.tradeoffEs : arch.tradeoffEn;
        return (
          <button
            key={arch.id}
            type="button"
            className={`archetype-card${selected ? " archetype-card--selected" : ""}`}
            onClick={() => onChange(arch.id)}
          >
            <span className="archetype-card__name">{name}</span>
            <span className="archetype-card__adv">{advantage}</span>
            <span className="archetype-card__trade">{tradeoff}</span>
          </button>
        );
      })}
    </div>
  );
}

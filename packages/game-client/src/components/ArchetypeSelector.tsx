import {
  getAllArchetypes,
  type ZegonArchetypeId,
} from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";
import { playSfx } from "../services/sfx.js";

interface ArchetypeSelectorProps {
  value: ZegonArchetypeId;
  onChange: (id: ZegonArchetypeId) => void;
}

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

export function ArchetypeSelector({ value, onChange }: ArchetypeSelectorProps) {
  const { language: lang, strings } = useLocale();
  const archetypes = getAllArchetypes();

  return (
    <div className="archetype-grid">
      {archetypes.map((arch) => {
        const selected = value === arch.id;
        const name = lang === "es" ? arch.nameEs : arch.nameEn;
        const tag = lang === "es" ? arch.westernTagEs : arch.westernTagEn;
        const advantage = lang === "es" ? arch.advantageEs : arch.advantageEn;
        const tradeoff = lang === "es" ? arch.tradeoffEs : arch.tradeoffEn;
        return (
          <button
            key={arch.id}
            type="button"
            aria-pressed={selected}
            className={`archetype-card archetype-card--${arch.id}${selected ? " archetype-card--selected" : ""}`}
            onClick={() => {
              if (value !== arch.id) playSfx("ui_select");
              onChange(arch.id);
            }}
          >
            <div className="archetype-card__banner" aria-hidden="true">
              <div className={`archetype-card__silhouette archetype-card__silhouette--${arch.id}`} />
            </div>
            <div className="archetype-card__body">
              <div className="archetype-card__header">
                <span className="archetype-card__name">{name}</span>
                <span
                  className="archetype-card__stars"
                  title={`${strings.archetypeDifficulty}: ${arch.difficultyStars}/5`}
                >
                  {stars(arch.difficultyStars)}
                </span>
              </div>
              <p className="archetype-card__tag">{tag}</p>
              <div className="archetype-card__traits">
                <p className="archetype-card__adv">
                  <span className="archetype-card__trait-mark">+</span>
                  {advantage}
                </p>
                <p className="archetype-card__trade">
                  <span className="archetype-card__trait-mark">−</span>
                  {tradeoff}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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

function ArchetypeCard({
  arch,
  selected,
  lang,
  difficultyLabel,
  onSelect,
}: {
  arch: ReturnType<typeof getAllArchetypes>[number];
  selected: boolean;
  lang: string;
  difficultyLabel: string;
  onSelect: () => void;
}) {
  const name = lang === "es" ? arch.nameEs : arch.nameEn;
  const tag = lang === "es" ? arch.westernTagEs : arch.westernTagEn;
  const advantage = lang === "es" ? arch.advantageEs : arch.advantageEn;
  const tradeoff = lang === "es" ? arch.tradeoffEs : arch.tradeoffEn;

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`archetype-card archetype-card--${arch.id}${selected ? " archetype-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="archetype-card__banner" aria-hidden="true">
        <div className={`archetype-card__silhouette archetype-card__silhouette--${arch.id}`} />
      </div>
      <div className="archetype-card__body">
        <div className="archetype-card__header">
          <span className="archetype-card__name">{name}</span>
          <span
            className="archetype-card__stars"
            title={`${difficultyLabel}: ${arch.difficultyStars}/5`}
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
}

export function ArchetypeSelector({ value, onChange }: ArchetypeSelectorProps) {
  const { language: lang, strings } = useLocale();
  const archetypes = getAllArchetypes();
  const currentIndex = Math.max(0, archetypes.findIndex((a) => a.id === value));
  const arch = archetypes[currentIndex] ?? archetypes[0]!;

  const prevLabel = lang === "es" ? "Modo anterior" : "Previous mode";
  const nextLabel = lang === "es" ? "Modo siguiente" : "Next mode";

  const selectAt = (index: number) => {
    const next = archetypes[index];
    if (!next || next.id === value) return;
    playSfx("ui_select");
    onChange(next.id);
  };

  const goPrev = () => {
    selectAt((currentIndex - 1 + archetypes.length) % archetypes.length);
  };

  const goNext = () => {
    selectAt((currentIndex + 1) % archetypes.length);
  };

  return (
    <div className="archetype-carousel">
      <button
        type="button"
        className="archetype-carousel__arrow archetype-carousel__arrow--prev"
        aria-label={prevLabel}
        onClick={goPrev}
      >
        ‹
      </button>

      <div className="archetype-carousel__stage">
        <ArchetypeCard
          arch={arch}
          selected
          lang={lang}
          difficultyLabel={strings.archetypeDifficulty}
          onSelect={() => playSfx("ui_select")}
        />
        <div className="archetype-carousel__dots" aria-hidden="true">
          {archetypes.map((a, i) => (
            <span
              key={a.id}
              className={`archetype-carousel__dot${i === currentIndex ? " archetype-carousel__dot--active" : ""}`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="archetype-carousel__arrow archetype-carousel__arrow--next"
        aria-label={nextLabel}
        onClick={goNext}
      >
        ›
      </button>
    </div>
  );
}

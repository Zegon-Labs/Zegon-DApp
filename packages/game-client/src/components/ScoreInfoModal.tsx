import {
  SCORE,
  dailyStreakMultiplier,
  surpriseComboBonus,
} from "@zegon/game-core";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { playSfx } from "../services/sfx.js";

export function useScoringRules(): string[] {
  const { strings } = useLocale();
  const surprisePer = surpriseComboBonus(2);
  const maxDailyMult = dailyStreakMultiplier(5).toFixed(2);
  return [
    format(strings.scoreInfoRounds, { points: SCORE.SURVIVED_ROUND }),
    format(strings.scoreInfoVictory, { points: SCORE.VICTORY_BONUS }),
    format(strings.scoreInfoRead, { points: SCORE.TIMES_READ_PENALTY }),
    format(strings.scoreInfoSurprise, { points: surprisePer }),
    format(strings.scoreInfoDaily, { mult: maxDailyMult }),
    strings.scoreInfoBlindsight,
  ];
}

export function ScoringRulesList() {
  const { strings } = useLocale();
  const rules = useScoringRules();
  return (
    <div className="stake-modal__section">
      <p className="stake-modal__section-title">{strings.scoreInfoTitle}</p>
      <p className="stake-modal__intro">{strings.scoreInfoIntro}</p>
      <ul className="stake-modal__scoring">
        {rules.map((rule, i) => (
          <li key={i}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}

interface ScoreInfoModalProps {
  onClose: () => void;
}

export function ScoreInfoModal({ onClose }: ScoreInfoModalProps) {
  const { strings } = useLocale();
  return (
    <div
      className="hero__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-info-title"
    >
      <div className="hero__panel hero__panel--wide stake-modal">
        <h2 className="hero__panel-title" id="score-info-title">
          {strings.scoreInfoTitle}
        </h2>
        <ScoringRulesList />
        <div className="stake-modal__actions">
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

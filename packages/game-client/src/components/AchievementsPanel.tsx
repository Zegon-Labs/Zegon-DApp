import { getWalletAddress } from "../services/wallet.js";
import { getCachedProfile } from "../services/profile.js";
import { useLocale } from "../hooks/useLocale.js";
import { gameBridge } from "../game/bridge.js";
import { playSfx } from "../services/sfx.js";
import { ACHIEVEMENTS } from "@zegon/game-core";

export function AchievementsList() {
  const { language: lang } = useLocale();
  const wallet = getWalletAddress();
  const profile = wallet ? getCachedProfile(wallet) : null;
  const unlocked = new Set(profile?.achievements ?? []);

  return (
    <ul className="achievements-list">
      {Object.values(ACHIEVEMENTS).map((a) => {
        const done = unlocked.has(a.id);
        const name = lang === "es" ? a.nameEs : a.nameEn;
        const desc = lang === "es" ? a.descEs : a.descEn;
        return (
          <li key={a.id} className={done ? "achievements-list__item--done" : ""}>
            <strong>{done ? "✓ " : ""}{name}</strong>
            <span>{desc}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AchievementsPanel() {
  const { strings } = useLocale();

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility hero__panel--utility-scroll">
        <h2 className="hero__panel-title">{strings.achievementsTitle}</h2>
        <p className="settings-hint">{strings.achievementsSubtitle}</p>
        <AchievementsList />
        <button
          type="button"
          className="utility-sprite-button hero__panel-back"
          onClick={() => {
            playSfx("ui_modal_close");
            gameBridge.navigate({ type: "hub" });
          }}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

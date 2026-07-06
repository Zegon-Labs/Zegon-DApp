import { useEffect, useState } from "react";
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  getUpgradeCost,
  getUpgradeLevel,
  previewPlayerDamage,
  type UpgradeId,
} from "@zegon/game-core";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { notify } from "../lib/toast.js";
import { fetchProfile, getCachedProfile, onProfileChange } from "../services/profile.js";
import { purchaseUpgradeOnServer } from "../services/upgrades.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";
import { playSfx } from "../services/sfx.js";

export function UpgradeSaloon() {
  const { strings, language: lang } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [, tick] = useState(0);

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    if (!wallet) return;
    void fetchProfile(wallet).then(() => tick((n) => n + 1));
    return onProfileChange((addr) => {
      if (addr === wallet) tick((n) => n + 1);
    });
  }, [wallet]);

  const profile = wallet ? getCachedProfile(wallet) : null;

  async function buy(id: UpgradeId) {
    if (!wallet || !profile) return;
    const ok = await purchaseUpgradeOnServer(wallet, id);
    if (ok) {
      playSfx("achievement_unlock");
      await fetchProfile(wallet);
      tick((n) => n + 1);
      notify.success(strings.saloonTitle);
    } else {
      notify.error(strings.profileSaveFailed);
    }
  }

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide hero__panel--utility">
        <h2 className="hero__panel-title">{strings.saloonTitle}</h2>
        {!wallet || !profile ? (
          <p className="hero__verify-copy">{strings.settingsProfileNoWallet}</p>
        ) : (
          <div className="utility-panel-body">
            <p className="profile-hero-stat">
              {format(strings.profileNotches, { n: profile.notches ?? 0 })} ·{" "}
              {format(strings.saloonDamagePreview, {
                dmg: previewPlayerDamage(profile.upgrades),
              })}
            </p>
            <div className="upgrade-grid">
              {UPGRADE_ORDER.map((id) => {
                const def = UPGRADE_DEFINITIONS[id];
                const level = getUpgradeLevel(profile.upgrades, id);
                const cost = getUpgradeCost(id, level);
                const maxed = cost === null;
                const name = lang === "es" ? def.nameEs : def.nameEn;
                const desc = lang === "es" ? def.descEs : def.descEn;
                return (
                  <div key={id} className="upgrade-card">
                    <div className="upgrade-card__head">
                      <span className="upgrade-card__name">{name}</span>
                      <span className="upgrade-card__level">
                        {level}/{def.maxLevel}
                      </span>
                    </div>
                    <p className="upgrade-card__desc">{desc}</p>
                    <button
                      type="button"
                      className="btn btn--secondary btn--menu"
                      disabled={maxed}
                      onClick={() => void buy(id)}
                    >
                      {maxed
                        ? strings.saloonOwned
                        : format(strings.saloonBuy, { cost: cost ?? 0 })}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          className="utility-sprite-button hero__panel-back"
          onClick={() => gameBridge.navigate({ type: "hub" })}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

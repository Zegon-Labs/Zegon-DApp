import { useEffect, useState, type ReactNode } from "react";
import type { Language } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { playSfx } from "../services/sfx.js";
import { useLocale } from "../hooks/useLocale.js";
import { notify } from "../lib/toast.js";
import {
  applyPreferences,
  getPreferences,
  onPreferencesChange,
  setPreferences,
  type GamePreferences,
} from "../services/preferences.js";
import {
  connectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
} from "../services/wallet.js";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <h3 className="settings-section__title">{title}</h3>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="settings-slider">
      <span className="settings-slider__label">
        {label}
        <span className="settings-slider__value">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        style={{ ["--range-progress" as string]: `${value}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function SettingsPanel({
  overlay = false,
  onClose,
}: {
  overlay?: boolean;
  onClose?: () => void;
}) {
  const { strings, language, setLanguage } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [prefs, setPrefs] = useState<GamePreferences>(() => getPreferences());

  useEffect(() => onWalletChange(setWallet), []);
  useEffect(() => onPreferencesChange(setPrefs), []);

  function savePrefs(patch: Partial<GamePreferences>) {
    const next = setPreferences(patch);
    applyPreferences(next);
    notify.info(strings.settingsSoon);
  }

  async function handleConnect() {
    if (!hasEthereumProvider()) {
      notify.error(strings.walletNoProvider);
      return;
    }
    try {
      await connectWallet();
      notify.success(strings.walletConnected);
    } catch {
      notify.error(strings.walletNoProvider);
    }
  }

  function pickLanguage(lang: Language) {
    if (language === lang) return;
    setLanguage(lang);
    notify.success(strings.saved);
  }

  function handleClose() {
    playSfx("ui_modal_close");
    if (overlay && onClose) {
      onClose();
    } else {
      gameBridge.navigate({ type: "hub" });
    }
  }

  return (
    <div
      className={`hero__overlay${overlay ? " hero__overlay--game" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="hero__panel hero__panel--wide hero__panel--scroll hero__panel--settings">
        <div className="hero__panel-header">
          <button
            type="button"
            className="hero__panel-nav-back"
            aria-label={strings.back}
            onClick={handleClose}
          >
            ←
          </button>
          <h2 className="hero__panel-title">{strings.settingsTitle}</h2>
        </div>

        <div className="settings-scroll-area">
        {!wallet ? (
          <SettingsSection title={strings.settingsSectionProfile}>
            <p className="settings-hint">{strings.settingsProfileNoWallet}</p>
            <button type="button" className="btn btn--secondary" onClick={() => void handleConnect()}>
              {strings.connectWallet}
            </button>
          </SettingsSection>
        ) : null}

        <SettingsSection title={strings.settingsSectionLanguage}>
          <div className="hero__lang-row">
            <button
              type="button"
              className={`btn btn--menu${language === "en" ? " lang-active" : ""}`}
              onClick={() => pickLanguage("en")}
            >
              {strings.languageEn}
            </button>
            <button
              type="button"
              className={`btn btn--menu${language === "es" ? " lang-active" : ""}`}
              onClick={() => pickLanguage("es")}
            >
              {strings.languageEs}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection title={strings.settingsSectionAudio}>
          <p className="settings-hint">{strings.settingsAudioNote}</p>
          <SliderRow
            label={strings.settingsMasterVolume}
            value={prefs.masterVolume}
            onChange={(v) => savePrefs({ masterVolume: v })}
          />
          <SliderRow
            label={strings.settingsMusicVolume}
            value={prefs.musicVolume}
            onChange={(v) => savePrefs({ musicVolume: v })}
          />
          <SliderRow
            label={strings.settingsSfxVolume}
            value={prefs.sfxVolume}
            onChange={(v) => savePrefs({ sfxVolume: v })}
          />
          <ToggleRow
            label={strings.settingsUiSounds}
            checked={prefs.uiSounds}
            onChange={(v) => savePrefs({ uiSounds: v })}
          />
        </SettingsSection>

        <SettingsSection title={strings.settingsSectionVideo}>
          <ToggleRow
            label={strings.settingsScanlines}
            checked={prefs.scanlines}
            onChange={(v) => savePrefs({ scanlines: v })}
          />
          <ToggleRow
            label={strings.settingsScreenShake}
            checked={prefs.screenShake}
            onChange={(v) => savePrefs({ screenShake: v })}
          />
          <ToggleRow
            label={strings.settingsGlitchEffects}
            checked={prefs.glitchEffects}
            onChange={(v) => savePrefs({ glitchEffects: v })}
          />
          <ToggleRow
            label={strings.settingsReducedMotion}
            checked={prefs.reducedMotion}
            onChange={(v) => savePrefs({ reducedMotion: v })}
          />
        </SettingsSection>

        <SettingsSection title={strings.settingsSectionGameplay}>
          <ToggleRow
            label={strings.settingsShowActionHints}
            checked={prefs.showActionHints}
            onChange={(v) => savePrefs({ showActionHints: v })}
          />
        </SettingsSection>

        <button
          type="button"
          className="btn btn--secondary hero__panel-back"
          onClick={handleClose}
        >
          {strings.back}
        </button>
      </div>
    </div>
    </div>
  );
}

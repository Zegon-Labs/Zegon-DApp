import { useEffect, useState, type ReactNode } from "react";
import type { Language } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { notify } from "../lib/toast.js";
import {
  fetchProfile,
  getCachedProfile,
  saveProfile,
  validateNickname,
} from "../services/profile.js";
import {
  applyPreferences,
  getPreferences,
  onPreferencesChange,
  setPreferences,
  type GamePreferences,
} from "../services/preferences.js";
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
  truncateAddress,
} from "../services/wallet.js";
import { ACHIEVEMENTS } from "@zegon/game-core";

function AchievementsList() {
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
  const [nickname, setNickname] = useState("");
  const [prefs, setPrefs] = useState<GamePreferences>(() => getPreferences());

  useEffect(() => onWalletChange(setWallet), []);
  useEffect(() => onPreferencesChange(setPrefs), []);

  useEffect(() => {
    if (!wallet) {
      setNickname("");
      return;
    }
    const cached = getCachedProfile(wallet);
    if (cached) setNickname(cached.nickname);
    void fetchProfile(wallet).then((p) => {
      if (p) setNickname(p.nickname);
    });
  }, [wallet]);

  function savePrefs(patch: Partial<GamePreferences>) {
    const next = setPreferences(patch);
    applyPreferences(next);
    notify.info(strings.settingsSoon);
  }

  async function handleSaveNickname() {
    if (!wallet) return;
    const check = validateNickname(nickname);
    if (!check.ok) {
      notify.error(check.key === "nicknameLength" ? strings.nicknameLength : strings.nicknameChars);
      return;
    }
    try {
      await saveProfile(wallet, nickname);
      notify.success(strings.profileSaved);
    } catch {
      notify.error(strings.profileSaveFailed);
    }
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

  return (
    <div
      className={`hero__overlay${overlay ? " hero__overlay--game" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="hero__panel hero__panel--wide hero__panel--scroll">
        <h2 className="hero__panel-title">{strings.settingsTitle}</h2>

        <SettingsSection title={strings.settingsSectionProfile}>
          {wallet ? (
            <>
              <p className="settings-meta">
                {strings.settingsProfileWallet}:{" "}
                <code>{truncateAddress(wallet)}</code>
              </p>
              <label className="settings-label" htmlFor="settings-nick">
                {strings.nicknameLabel}
              </label>
              <input
                id="settings-nick"
                className="settings-input"
                value={nickname}
                maxLength={16}
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="settings-hint">{strings.nicknameHint}</p>
              <button
                type="button"
                className="btn btn--menu settings-inline-btn"
                onClick={() => void handleSaveNickname()}
              >
                {strings.settingsEditNickname}
              </button>
              <button
                type="button"
                className="btn btn--menu settings-inline-btn"
                onClick={() => {
                  disconnectWallet();
                  notify.info(strings.disconnectWallet);
                }}
              >
                {strings.disconnectWallet}
              </button>
            </>
          ) : (
            <>
              <p className="settings-hint">{strings.settingsProfileNoWallet}</p>
              <button type="button" className="btn btn--secondary" onClick={() => void handleConnect()}>
                {strings.connectWallet}
              </button>
            </>
          )}
        </SettingsSection>

        <SettingsSection title={strings.settingsSectionLanguage}>
          <div className="hero__lang-row">
            <button
              type="button"
              className="btn btn--menu"
              style={language === "en" ? { borderColor: "var(--ember)" } : undefined}
              onClick={() => pickLanguage("en")}
            >
              {strings.languageEn}
            </button>
            <button
              type="button"
              className="btn btn--menu"
              style={language === "es" ? { borderColor: "var(--ember)" } : undefined}
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

        <SettingsSection title={strings.achievementsTitle}>
          <AchievementsList />
        </SettingsSection>

        <button
          type="button"
          className="btn btn--secondary hero__panel-back"
          onClick={() => {
            if (overlay && onClose) {
              onClose();
            } else {
              gameBridge.navigate({ type: "hub" });
            }
          }}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

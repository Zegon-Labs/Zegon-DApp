import { useState } from "react";
import type { Language } from "../i18n/index.js";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { notify } from "../lib/toast.js";

export function SettingsPanel() {
  const { strings, language, setLanguage } = useLocale();
  const [saved, setSaved] = useState(false);

  function pick(lang: Language) {
    if (language === lang) return;
    setLanguage(lang);
    setSaved(true);
    notify.success(strings.saved);
    window.setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel">
        <h2 className="hero__panel-title">{strings.settingsTitle}</h2>
        <p className="hero__verify-copy" style={{ marginTop: 0, marginBottom: 16 }}>
          {strings.language}
        </p>
        <div className="hero__lang-row">
          <button
            type="button"
            className="btn btn--menu"
            style={language === "en" ? { borderColor: "var(--ember)" } : undefined}
            onClick={() => pick("en")}
          >
            {strings.languageEn}
          </button>
          <button
            type="button"
            className="btn btn--menu"
            style={language === "es" ? { borderColor: "var(--ember)" } : undefined}
            onClick={() => pick("es")}
          >
            {strings.languageEs}
          </button>
        </div>
        {saved && (
          <p className="hero__verify-copy" style={{ marginTop: 12, color: "var(--verified)" }}>
            {strings.saved}
          </p>
        )}
        <button
          type="button"
          className="btn btn--secondary hero__panel-back"
          onClick={() => gameBridge.navigate({ type: "hub" })}
        >
          {strings.back}
        </button>
      </div>
    </div>
  );
}

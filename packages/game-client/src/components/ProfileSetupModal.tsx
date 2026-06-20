import { useEffect, useState } from "react";
import { useLocale } from "../hooks/useLocale.js";
import { notify } from "../lib/toast.js";
import { fetchProfile, saveProfile, validateNickname } from "../services/profile.js";

interface ProfileSetupModalProps {
  address: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProfileSetupModal({ address, onComplete, onSkip }: ProfileSetupModalProps) {
  const { strings } = useLocale();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchProfile(address);
  }, [address]);

  async function handleSave() {
    const check = validateNickname(nickname);
    if (!check.ok) {
      setError(check.key === "nicknameLength" ? strings.nicknameLength : strings.nicknameChars);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProfile(address, nickname);
      notify.success(strings.profileSaved, nickname.trim());
      onComplete();
    } catch {
      setError(strings.profileSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hero__overlay" role="dialog" aria-modal="true">
      <div className="hero__panel hero__panel--wide">
        <h2 className="hero__panel-title">{strings.profileSetupTitle}</h2>
        <p className="hero__verify-copy" style={{ marginTop: 0, marginBottom: 16 }}>
          {strings.profileSetupBody}
        </p>
        <label className="settings-label" htmlFor="nickname-input">
          {strings.nicknameLabel}
        </label>
        <input
          id="nickname-input"
          className="settings-input"
          value={nickname}
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          placeholder={strings.nicknamePlaceholder}
          onChange={(e) => {
            setNickname(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
        />
        <p className="settings-hint">{strings.nicknameHint}</p>
        {error && <p className="settings-error">{error}</p>}
        <button
          type="button"
          className="btn btn--primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          <span className="btn__title">{strings.profileSave}</span>
        </button>
        {onSkip && (
          <button type="button" className="btn btn--secondary hero__panel-back" onClick={onSkip}>
            {strings.profileSkip}
          </button>
        )}
      </div>
    </div>
  );
}

export interface GamePreferences {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiSounds: boolean;
  scanlines: boolean;
  screenShake: boolean;
  glitchEffects: boolean;
  reducedMotion: boolean;
  showActionHints: boolean;
}

const STORAGE_KEY = "zegon-preferences";

export const DEFAULT_PREFERENCES: GamePreferences = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 100,
  uiSounds: true,
  scanlines: true,
  screenShake: true,
  glitchEffects: true,
  reducedMotion: false,
  showActionHints: true,
};

type PrefsListener = (prefs: GamePreferences) => void;
const listeners = new Set<PrefsListener>();

function notify(prefs: GamePreferences): void {
  for (const fn of listeners) fn(prefs);
}

export function getPreferences(): GamePreferences {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<GamePreferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function setPreferences(patch: Partial<GamePreferences>): GamePreferences {
  const next = { ...getPreferences(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notify(next);
  return next;
}

export function onPreferencesChange(listener: PrefsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyPreferences(prefs: GamePreferences): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("zegon-reduced-motion", prefs.reducedMotion);
  }
  void import("./music.js").then(({ applyMusicVolume }) => applyMusicVolume(prefs));
  void import("./sfx.js").then(({ applySfxVolume }) => applySfxVolume());
}

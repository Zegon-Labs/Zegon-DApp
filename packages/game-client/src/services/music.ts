import { getPreferences, type GamePreferences } from "./preferences.js";

const MUSIC_SRC = "/audio/ghosts-in-spur-dust.mp3";

let audio: HTMLAudioElement | null = null;
let unlockListenersAttached = false;

function computeVolume(prefs: GamePreferences): number {
  return (prefs.masterVolume / 100) * (prefs.musicVolume / 100);
}

function attachUnlockListeners(): void {
  if (unlockListenersAttached || typeof document === "undefined") return;
  unlockListenersAttached = true;

  const unlock = () => {
    void audio?.play().catch(() => {});
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
    unlockListenersAttached = false;
  };

  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audio) {
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = "auto";
  }
  return audio;
}

export function applyMusicVolume(prefs: GamePreferences): void {
  const track = ensureAudio();
  if (!track) return;
  track.volume = computeVolume(prefs);
}

export function startBackgroundMusic(): void {
  const track = ensureAudio();
  if (!track) return;

  applyMusicVolume(getPreferences());

  if (!track.paused) return;

  void track.play().catch(() => {
    attachUnlockListeners();
  });
}

export function stopBackgroundMusic(): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

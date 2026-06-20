import { getPreferences, type GamePreferences } from "./preferences.js";

const MUSIC_SRC = "/audio/ghosts-in-spur-dust.mp3";
const MUSIC_UNLOCK_KEY = "zegon-music-unlocked";

let audio: HTMLAudioElement | null = null;
let unlockListenersAttached = false;
let retryTimer: ReturnType<typeof setInterval> | null = null;

function computeVolume(prefs: GamePreferences): number {
  return (prefs.masterVolume / 100) * (prefs.musicVolume / 100);
}

function detachUnlockListeners(): void {
  if (!unlockListenersAttached || typeof document === "undefined") return;
  const unlock = (document as Document & { __zegonMusicUnlock?: () => void }).__zegonMusicUnlock;
  if (!unlock) return;
  for (const ev of ["pointerdown", "keydown", "touchstart", "click"] as const) {
    document.removeEventListener(ev, unlock, true);
  }
  unlockListenersAttached = false;
}

function attachUnlockListeners(): void {
  if (unlockListenersAttached || typeof document === "undefined") return;
  unlockListenersAttached = true;

  const unlock = () => {
    void tryPlay().then((playing) => {
      if (playing) detachUnlockListeners();
    });
  };

  (document as Document & { __zegonMusicUnlock?: () => void }).__zegonMusicUnlock = unlock;

  for (const ev of ["pointerdown", "keydown", "touchstart", "click"] as const) {
    document.addEventListener(ev, unlock, { capture: true, passive: true });
  }
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  if (!audio) {
    const existing = document.getElementById("zegon-bgm");
    audio =
      existing instanceof HTMLAudioElement
        ? existing
        : new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
  }
  return audio;
}

function scheduleAutoplayRetries(): void {
  if (retryTimer || typeof window === "undefined") return;
  if (!localStorage.getItem(MUSIC_UNLOCK_KEY)) return;

  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts += 1;
    void tryPlay().then((playing) => {
      if (playing || attempts >= 8) {
        if (retryTimer) clearInterval(retryTimer);
        retryTimer = null;
      }
    });
  }, 250);
}

async function tryPlay(): Promise<boolean> {
  const track = ensureAudio();
  if (!track) return false;

  applyMusicVolume(getPreferences());

  if (!track.paused) {
    localStorage.setItem(MUSIC_UNLOCK_KEY, "1");
    return true;
  }

  try {
    await track.play();
    localStorage.setItem(MUSIC_UNLOCK_KEY, "1");
    detachUnlockListeners();
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    return true;
  } catch {
    attachUnlockListeners();
    return false;
  }
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

  void tryPlay();

  track.addEventListener("canplaythrough", () => void tryPlay(), { once: true });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void tryPlay();
    });
  }

  scheduleAutoplayRetries();
}

export function stopBackgroundMusic(): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

import { getPreferences } from "./preferences.js";

const VO_BASE = "/audio/voice/zegon";

export const VOICE = {
  smell_pattern: `${VO_BASE}/smell_pattern.mp3`,
  your_soul_whispers: `${VO_BASE}/your_soul_whispers.mp3`,
  nothing_to_read_yet: `${VO_BASE}/nothing_to_read_yet.mp3`,
  blind_sees_patterns: `${VO_BASE}/blind_sees_patterns.mp3`,
  listening: `${VO_BASE}/listening.mp3`,
  patterns_in_dust: `${VO_BASE}/patterns_in_dust.mp3`,
  your_turn_outlaw: `${VO_BASE}/your_turn_outlaw.mp3`,
  caught_you: `${VO_BASE}/caught_you.mp3`,
  blind_doesnt_miss: `${VO_BASE}/blind_doesnt_miss.mp3`,
  you_draw_blood: `${VO_BASE}/you_draw_blood.mp3`,
  not_bad: `${VO_BASE}/not_bad.mp3`,
  clever: `${VO_BASE}/clever.mp3`,
  deadeye: `${VO_BASE}/deadeye.mp3`,
  step_into_dust: `${VO_BASE}/step_into_dust.mp3`,
  impossible: `${VO_BASE}/impossible.mp3`,
  blind_wins_again: `${VO_BASE}/blind_wins_again.mp3`,
  stalemate: `${VO_BASE}/stalemate.mp3`,
} as const;

export type VoiceId = keyof typeof VOICE;

let currentVoice: HTMLAudioElement | null = null;
let pendingDelay: ReturnType<typeof setTimeout> | null = null;
let hitZegonAlt = false;
let hitPlayerAlt = false;

function resolveVoiceVolume(multiplier = 1): number {
  const prefs = getPreferences();
  return (prefs.masterVolume / 100) * (prefs.sfxVolume / 100) * multiplier;
}

function stopCurrentVoice(): void {
  if (pendingDelay) {
    clearTimeout(pendingDelay);
    pendingDelay = null;
  }
  if (!currentVoice) return;
  currentVoice.pause();
  currentVoice.currentTime = 0;
  currentVoice = null;
}

export function playVoice(
  id: VoiceId,
  options?: { volume?: number; delayMs?: number; interrupt?: boolean },
): void {
  const vol = resolveVoiceVolume(options?.volume ?? 0.92);
  if (vol <= 0) return;

  const play = (): void => {
    pendingDelay = null;
    if (options?.interrupt !== false) {
      stopHubCharacterVoice();
      stopCurrentVoice();
    }
    const audio = new Audio(VOICE[id]);
    audio.preload = "auto";
    audio.volume = Math.min(1, vol);
    currentVoice = audio;
    audio.onended = () => {
      if (currentVoice === audio) currentVoice = null;
    };
    void audio.play().catch(() => {
      if (currentVoice === audio) currentVoice = null;
    });
  };

  if (options?.delayMs && options.delayMs > 0) {
    if (pendingDelay) clearTimeout(pendingDelay);
    pendingDelay = setTimeout(play, options.delayMs);
    return;
  }

  play();
}

/** Ambient hub lines when the player taps ZEGON on the landing. */
const HUB_CHARACTER_VOICES: readonly VoiceId[] = [
  "smell_pattern",
  "your_soul_whispers",
  "nothing_to_read_yet",
  "blind_sees_patterns",
  "listening",
  "patterns_in_dust",
  "step_into_dust",
  "your_turn_outlaw",
];

let hubVoiceAudio: HTMLAudioElement | null = null;
let hubVoiceBusy = false;
let lastHubVoiceId: VoiceId | null = null;

function pickHubCharacterVoice(): VoiceId {
  const pool =
    lastHubVoiceId && HUB_CHARACTER_VOICES.length > 1
      ? HUB_CHARACTER_VOICES.filter((id) => id !== lastHubVoiceId)
      : HUB_CHARACTER_VOICES;
  const id = pool[Math.floor(Math.random() * pool.length)]!;
  lastHubVoiceId = id;
  return id;
}

function stopHubCharacterVoice(): void {
  if (!hubVoiceAudio) {
    hubVoiceBusy = false;
    return;
  }
  hubVoiceAudio.pause();
  hubVoiceAudio.currentTime = 0;
  hubVoiceAudio = null;
  hubVoiceBusy = false;
}

/** Play one random hub line — ignores clicks while a line is already playing. */
export function playHubCharacterVoice(): void {
  if (hubVoiceBusy) return;

  const vol = resolveVoiceVolume(0.9);
  if (vol <= 0) return;

  hubVoiceBusy = true;
  const id = pickHubCharacterVoice();
  const audio = new Audio(VOICE[id]);
  audio.preload = "auto";
  audio.volume = Math.min(1, vol);
  hubVoiceAudio = audio;

  const onDone = (): void => {
    if (hubVoiceAudio !== audio) return;
    hubVoiceAudio = null;
    hubVoiceBusy = false;
  };

  audio.onended = onDone;
  audio.onerror = onDone;
  void audio.play().catch(onDone);
}

export function isHubCharacterVoicePlaying(): boolean {
  return hubVoiceBusy;
}

function normalizeTaunt(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?…,]/g, "")
    .trim();
}

const TAUNT_VO: Record<string, VoiceId> = {
  "i smell your pattern stranger": "smell_pattern",
  "your soul whispers": "your_soul_whispers",
  "nothing to read yet": "nothing_to_read_yet",
  "the blind sees patterns": "blind_sees_patterns",
};

export function playTauntVoice(taunt: string | null | undefined): boolean {
  if (!taunt) return false;
  const id = TAUNT_VO[normalizeTaunt(taunt)];
  if (!id) return false;
  playVoice(id, { delayMs: 280 });
  return true;
}

export function playThinkingVoice(): void {
  const pool: VoiceId[] = ["listening", "patterns_in_dust"];
  playVoice(pool[Math.floor(Math.random() * pool.length)]!, {
    volume: 0.85,
    delayMs: 450,
  });
}

export function playRoundOutcomeVoice(outcome: {
  playerDamage: number;
  zegonDamage: number;
  predictionCorrect: boolean;
}): void {
  if (outcome.playerDamage > 0) {
    const id = hitPlayerAlt ? "blind_doesnt_miss" : "caught_you";
    hitPlayerAlt = !hitPlayerAlt;
    playVoice(id, { delayMs: 380 });
    return;
  }
  if (outcome.zegonDamage > 0) {
    const id = hitZegonAlt ? "not_bad" : "you_draw_blood";
    hitZegonAlt = !hitZegonAlt;
    playVoice(id, { delayMs: 380 });
    return;
  }
  if (!outcome.predictionCorrect) {
    playVoice("clever", { delayMs: 520 });
  }
}

export function playDuelEndVoice(winner: string): void {
  if (winner === "PLAYER") playVoice("impossible", { delayMs: 650 });
  else if (winner === "ZEGON") playVoice("blind_wins_again", { delayMs: 650 });
  else playVoice("stalemate", { delayMs: 650 });
}

export function stopAllVoice(): void {
  stopCurrentVoice();
  stopHubCharacterVoice();
  lastHubVoiceId = null;
}

export function resetVoiceState(): void {
  stopAllVoice();
  hitZegonAlt = false;
  hitPlayerAlt = false;
}

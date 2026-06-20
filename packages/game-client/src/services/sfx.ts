import { PlayerAction } from "@zegon/game-core";
import { getPreferences } from "./preferences.js";

export const SFX = {
  fire_high: "/audio/sfx/combat/fire_high.wav",
  fire_low: "/audio/sfx/combat/fire_low.wav",
  dodge: "/audio/sfx/combat/dodge.wav",
  feint: "/audio/sfx/combat/feint.wav",
  reload: "/audio/sfx/combat/reload.wav",
  hit_player: "/audio/sfx/combat/hit_player.wav",
  hit_zegon: "/audio/sfx/combat/hit_zegon.wav",
  miss: "/audio/sfx/combat/miss.wav",
  deadeye_sting: "/audio/sfx/combat/deadeye_sting.wav",
  blindsight_up: "/audio/sfx/combat/blindsight_up.wav",
  blindsight_down: "/audio/sfx/combat/blindsight_down.wav",
  empty_gun: "/audio/sfx/combat/empty_gun.wav",
  zegon_thinking: "/audio/sfx/duel/zegon_thinking.wav",
  your_turn: "/audio/sfx/duel/your_turn.wav",
  round_resolve: "/audio/sfx/duel/round_resolve.wav",
  duel_start: "/audio/sfx/duel/duel_start.wav",
  duel_end_win: "/audio/sfx/duel/duel_end_win.wav",
  duel_end_lose: "/audio/sfx/duel/duel_end_lose.wav",
  duel_end_draw: "/audio/sfx/duel/duel_end_draw.wav",
  glitch_ambient: "/audio/sfx/duel/glitch_ambient.wav",
  ui_click: "/audio/sfx/ui/ui_click.wav",
  ui_hover: "/audio/sfx/ui/ui_hover.wav",
  ui_modal_open: "/audio/sfx/ui/ui_modal_open.wav",
  ui_modal_close: "/audio/sfx/ui/ui_modal_close.wav",
  ui_navigate: "/audio/sfx/ui/ui_navigate.wav",
  ui_select: "/audio/sfx/ui/ui_select.wav",
  ui_confirm: "/audio/sfx/ui/ui_confirm.wav",
  ui_toast_success: "/audio/sfx/ui/ui_toast_success.wav",
  ui_toast_error: "/audio/sfx/ui/ui_toast_error.wav",
  ui_toast_info: "/audio/sfx/ui/ui_toast_info.wav",
  tutorial_slide_next: "/audio/sfx/tutorial/tutorial_slide_next.wav",
  tutorial_slide_back: "/audio/sfx/tutorial/tutorial_slide_back.wav",
  tutorial_correct: "/audio/sfx/tutorial/tutorial_correct.wav",
  tutorial_complete: "/audio/sfx/tutorial/tutorial_complete.wav",
  verify_success: "/audio/sfx/polish/verify_success.wav",
  achievement_unlock: "/audio/sfx/polish/achievement_unlock.wav",
  daily_stake: "/audio/sfx/polish/daily_stake.wav",
} as const;

export type SfxId = keyof typeof SFX;

const UI_SFX = new Set<SfxId>([
  "ui_click",
  "ui_hover",
  "ui_modal_open",
  "ui_modal_close",
  "ui_navigate",
  "ui_select",
  "ui_confirm",
  "ui_toast_success",
  "ui_toast_error",
  "ui_toast_info",
]);

const activeLoops = new Map<SfxId, HTMLAudioElement>();
let lastHoverAt = 0;

function resolveVolume(id: SfxId, multiplier = 1): number {
  const prefs = getPreferences();
  if (UI_SFX.has(id) && !prefs.uiSounds) return 0;
  return (prefs.masterVolume / 100) * (prefs.sfxVolume / 100) * multiplier;
}

function spawnAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

export function playSfx(
  id: SfxId,
  options?: { volume?: number; rate?: number },
): void {
  const vol = resolveVolume(id, options?.volume ?? 1);
  if (vol <= 0) return;
  const audio = spawnAudio(SFX[id]);
  audio.volume = Math.min(1, vol);
  if (options?.rate) audio.playbackRate = options.rate;
  void audio.play().catch(() => {});
}

export function playUiClick(): void {
  playSfx("ui_click");
}

export function playUiHover(): void {
  const now = Date.now();
  if (now - lastHoverAt < 120) return;
  lastHoverAt = now;
  playSfx("ui_hover", { volume: 0.55 });
}

/** Hover on duel action chips — uses SFX volume, not the UI-sounds toggle. */
export function playActionHover(): void {
  const now = Date.now();
  if (now - lastHoverAt < 100) return;
  lastHoverAt = now;
  const prefs = getPreferences();
  const vol = (prefs.masterVolume / 100) * (prefs.sfxVolume / 100) * 0.65;
  if (vol <= 0) return;
  const audio = spawnAudio(SFX.ui_hover);
  audio.volume = Math.min(1, vol);
  void audio.play().catch(() => {});
}

export function startSfxLoop(id: SfxId, options?: { volume?: number }): void {
  stopSfxLoop(id);
  const vol = resolveVolume(id, options?.volume ?? 1);
  if (vol <= 0) return;
  const audio = spawnAudio(SFX[id]);
  audio.loop = true;
  audio.volume = Math.min(1, vol);
  activeLoops.set(id, audio);
  void audio.play().catch(() => {});
}

export function stopSfxLoop(id: SfxId): void {
  const audio = activeLoops.get(id);
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  activeLoops.delete(id);
}

export function stopAllSfxLoops(): void {
  for (const id of [...activeLoops.keys()]) {
    stopSfxLoop(id);
  }
}

export function applySfxVolume(): void {
  for (const [id, audio] of activeLoops) {
    const vol = resolveVolume(id);
    audio.volume = Math.min(1, vol);
    if (vol <= 0) stopSfxLoop(id);
  }
}

const ACTION_SFX: Partial<Record<PlayerAction, SfxId>> = {
  [PlayerAction.FIRE_HIGH]: "fire_high",
  [PlayerAction.FIRE_LOW]: "fire_low",
  [PlayerAction.DODGE_HIGH]: "dodge",
  [PlayerAction.DODGE_LOW]: "dodge",
  [PlayerAction.FEINT]: "feint",
  [PlayerAction.RELOAD]: "reload",
};

const FIRE_GAIN = 1.42;

function playFireSfx(id: "fire_high" | "fire_low", volumeMultiplier = 1): void {
  const vol = resolveVolume(id, volumeMultiplier);
  if (vol <= 0) return;
  const audio = spawnAudio(SFX[id]);
  audio.volume = Math.min(1, vol);
  try {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = FIRE_GAIN;
    source.connect(gain);
    gain.connect(ctx.destination);
    audio.onended = () => void ctx.close();
    void audio.play().catch(() => void ctx.close());
  } catch {
    void audio.play().catch(() => {});
  }
}

export function playActionSfx(action: PlayerAction, options?: { zegon?: boolean }): void {
  const id = ACTION_SFX[action];
  if (!id) return;
  if (id === "fire_high" || id === "fire_low") {
    playFireSfx(id, options?.zegon ? 1.05 : 1.15);
    return;
  }
  playSfx(id, { volume: options?.zegon ? 0.88 : 1 });
}

export function playRoundOutcomeSfx(outcome: {
  playerAction: string;
  zegonMove: string;
  playerDamage: number;
  zegonDamage: number;
  blindsightDelta: number;
}): void {
  if (outcome.blindsightDelta > 0) {
    playSfx("blindsight_up");
  }
  if (outcome.playerDamage > 0) {
    playSfx("hit_player");
  }
  if (outcome.zegonDamage > 0) {
    playSfx("hit_zegon");
  }

  const playerFired =
    outcome.playerAction === PlayerAction.FIRE_HIGH ||
    outcome.playerAction === PlayerAction.FIRE_LOW;
  const zegonFired =
    outcome.zegonMove === PlayerAction.FIRE_HIGH ||
    outcome.zegonMove === PlayerAction.FIRE_LOW;

  if (playerFired && outcome.zegonDamage === 0 && outcome.playerDamage === 0) {
    playSfx("miss", { volume: 0.85 });
  }
  if (zegonFired && outcome.playerDamage === 0 && outcome.zegonDamage === 0) {
    playSfx("miss", { volume: 0.7 });
  }
}

export function playZegonMoveSfx(move: string): void {
  const map: Record<string, SfxId> = {
    FIRE_HIGH: "fire_high",
    FIRE_LOW: "fire_low",
    DODGE_HIGH: "dodge",
    DODGE_LOW: "dodge",
    FEINT: "feint",
    RELOAD: "reload",
  };
  const id = map[move];
  if (!id) return;
  if (id === "fire_high" || id === "fire_low") {
    playFireSfx(id, 1.1);
    return;
  }
  playSfx(id, { volume: 0.88 });
}

export function playDuelEndSfx(winner: string): void {
  if (winner === "ZEGON") playSfx("duel_end_lose");
  else if (winner === "DRAW") playSfx("duel_end_draw");
}

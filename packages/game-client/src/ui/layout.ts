/** Native Phaser resolution — 16:9, 1.5× legacy 854×480 for sharper fullscreen scaling. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Duel layout zones — 1280×720, non-overlapping vertical bands. */
export const DUEL_LAYOUT = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  topBar: { y: 21 },
  history: { x: 30, y: 78, w: 248, h: 168 },
  blindsight: { labelX: 1248, labelY: 21, barX: 957, barY: 54, barW: 294, barH: 12 },

  prompt: { y: 84, w: 660, h: 66 },
  taunt: { y: 162, maxW: 750 },
  roundResult: { y: 528, w: 780, h: 84, maxH: 138 },
  /** Compact round feedback — right side, below chrome buttons. */
  roundToast: { x: 1008, y: 178, w: 248, h: 108 },

  arena: { y: 342 },
  divider: { y: 498 },

  stats: { y: 546, hpBarY: 522, hpBarW: 180, hpBarH: 9 },
  actions: { y: 639, h: 48, gap: 8 },
  tooltip: { y: 597 },
  practicePopup: { w: 630, h: 87, gap: 21 },

  /** In-game chrome — avoids HUD overlap (blindsight top-right). */
  chrome: { marginX: 24, skipY: 20, settingsY: 54, surrenderY: 82, settingsRightY: 128 },
} as const;

export const TUTORIAL_BUBBLE = {
  lesson: { x: 420, y: 252 },
  practice: { x: 372, y: 222 },
  maxW: 450,
} as const;

export function practiceStripCenterY(panelH: number): number {
  const L = DUEL_LAYOUT;
  const belowPrompt = L.prompt.y + L.prompt.h + L.practicePopup.gap;
  return belowPrompt + panelH / 2;
}

export function practicePopupCenterY(): number {
  const L = DUEL_LAYOUT;
  return L.actions.y - L.actions.h / 2 - L.practicePopup.gap - L.practicePopup.h / 2;
}

export function actionButtonWidth(screenWidth: number, count: number, gap: number): number {
  return Math.min(222, (screenWidth - 54 - gap * (count - 1)) / count);
}

export const TITLE_LAYOUT = {
  logoY: 87,
  taglineY: 147,
  buttonsStartY: 228,
  buttonGap: 69,
  footerY: 648,
  linkY: 684,
} as const;

export function titleButtonY(index: number): number {
  return TITLE_LAYOUT.buttonsStartY + index * TITLE_LAYOUT.buttonGap;
}

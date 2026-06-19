/** Duel layout zones — 854×480, non-overlapping vertical bands. */
export const DUEL_LAYOUT = {
  width: 854,
  height: 480,

  topBar: { y: 14 },
  history: { x: 20, y: 52, w: 155, h: 96 },
  blindsight: { labelX: 834, labelY: 14, barX: 638, barY: 36, barW: 196, barH: 8 },

  /** Center status band — left column (history) ends at x≈175, safe. */
  prompt: { y: 56, w: 440, h: 44 },
  taunt: { y: 108, maxW: 500 },
  roundResult: { y: 56, w: 440, h: 96 },

  arena: { y: 228 },
  divider: { y: 332 },

  stats: { y: 364, hpBarY: 348, hpBarW: 120, hpBarH: 6 },
  actions: { y: 426, h: 32, gap: 5 },
  /** Hint line above action buttons (duel). */
  tooltip: { y: 398 },
  practicePopup: { w: 420, h: 58, gap: 14 },
} as const;

/** Compact tutorial panel anchors (854×480). */
export const TUTORIAL_BUBBLE = {
  lesson: { x: 280, y: 168 },
  practice: { x: 248, y: 148 },
  maxW: 300,
} as const;

export function practicePopupCenterY(): number {
  const L = DUEL_LAYOUT;
  return L.actions.y - L.actions.h / 2 - L.practicePopup.gap - L.practicePopup.h / 2;
}

export function actionButtonWidth(screenWidth: number, count: number, gap: number): number {
  return Math.min(148, (screenWidth - 36 - gap * (count - 1)) / count);
}

/** Title screen vertical rhythm. */
export const TITLE_LAYOUT = {
  logoY: 58,
  taglineY: 98,
  buttonsStartY: 152,
  buttonGap: 46,
  footerY: 432,
  linkY: 456,
} as const;

export function titleButtonY(index: number): number {
  return TITLE_LAYOUT.buttonsStartY + index * TITLE_LAYOUT.buttonGap;
}

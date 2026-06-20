/** Native Phaser resolution — 16:9, 1.5× legacy 854×480 for sharper fullscreen scaling. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Duel layout — HUD over landing bg + character. */
export const DUEL_LAYOUT = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  header: { logoY: 6, logoMaxW: 112 },

  prompt: { y: 84, w: 660, h: 66 },
  taunt: { y: 162, maxW: 750 },

  history: { x: 24, y: 18, w: 240, visibleRows: 6, pipGap: 5, pipSize: 8 },

  blindsight: {
    panelW: 220,
    panelH: 118,
    panelY: 22,
    pad: 10,
    barH: 9,
    segments: 10,
  },

  arena: { y: 318, characterMaxH: 480 },

  statusLine: { y: 412 },
  chooseAction: { y: 442 },
  actionHint: { y: 488 },
  actions: { y: 536, h: 46, gap: 10 },

  stats: {
    panelW: 240,
    panelH: 108,
    playerX: 20,
    y: 592,
    iconSize: 18,
    iconGap: 5,
    rowGap: 8,
    pad: 12,
    nameRowH: 26,
  },

  roundToast: { x: 1256, y: 292, maxW: 260 },

  /** Top-right chrome — stacked hub buttons below blindsight panel. */
  chrome: {
    marginX: 24,
    skipY: 20,
    panelY: 146,
    buttonW: 220,
    buttonH: 40,
    buttonGap: 8,
  },
} as const;

export const RESULT_LAYOUT = {
  panelCenterY: 360,
  panelW: 310,
} as const;

export function resultButtonsStartY(): number {
  return RESULT_LAYOUT.panelCenterY + 260;
}

export const TUTORIAL_BUBBLE = {
  lesson: { x: 420, y: 252 },
  practice: { x: 372, y: 222 },
  maxW: 450,
} as const;

export function practiceStripCenterY(panelH: number): number {
  const L = DUEL_LAYOUT;
  return L.statusLine.y - 40 + panelH / 2;
}

export function practicePopupCenterY(): number {
  const L = DUEL_LAYOUT;
  return L.actions.y - L.actions.h / 2 - 24 - 44;
}

export function actionButtonWidth(screenWidth: number, count: number, gap: number): number {
  return Math.min(155, (screenWidth - 48 - gap * (count - 1)) / count);
}

export const TITLE_LAYOUT = {
  logoY: 72,
  logoMaxW: 300,
  taglineY: 168,
  buttonsStartY: 228,
  buttonGap: 69,
  footerY: 648,
  linkY: 684,
} as const;

export function titleButtonY(index: number): number {
  return TITLE_LAYOUT.buttonsStartY + index * TITLE_LAYOUT.buttonGap;
}

export function blindsightPanelX(screenWidth: number): number {
  return screenWidth - DUEL_LAYOUT.blindsight.panelW - DUEL_LAYOUT.chrome.marginX;
}

export function zegonStatsPanelX(screenWidth: number): number {
  return screenWidth - DUEL_LAYOUT.stats.playerX - DUEL_LAYOUT.stats.panelW;
}

export function chromeButtonCenterX(screenWidth: number): number {
  const L = DUEL_LAYOUT;
  return screenWidth - L.chrome.marginX - L.chrome.buttonW / 2;
}

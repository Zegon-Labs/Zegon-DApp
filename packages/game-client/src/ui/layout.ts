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

  history: { x: 0, y: 2, w: 240, visibleRows: 6, pipGap: 5, pipSize: 8 },

  blindsight: {
    panelW: 220,
    panelH: 118,
    panelY: 22,
    pad: 10,
    barH: 9,
    segments: 10,
  },

  arena: { y: 318, characterMaxH: 480 },

  statusLine: { y: 428 },
  chooseAction: { y: 448 },
  duelTip: { y: 468 },
  actions: { y: 512, h: 48, gap: 12 },
  /** Single fixed line for action + item descriptions (hover / ?). */
  actionDesc: { y: 552 },
  items: { y: 600, h: 36, gap: 10, helpSize: 18 },

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

  roundToast: { x: 1180, y: 292, maxW: 260 },

  /** Top-right chrome — stacked hub buttons below blindsight panel. */
  chrome: {
    marginX: 24,
    skipY: 20,
    panelY: 146,
    buttonW: 220,
    buttonH: 40,
    buttonGap: 8,
  },

  /**
   * Unified bottom strip replacing the separate life-panels + action rows.
   * Life panels sit flush left/right inside the strip; all 5 action buttons
   * fill the centre zone in a single horizontal row.
   * Texts (status, choose-action, tip, desc) sit immediately above the strip.
   */
  bottomStrip: {
    // Strip background
    y: 620,
    h: 100,
    centerY: 670,

    // Texts just above the strip (origin 0.5,0 — top of text)
    statusY: 514,
    chooseActionY: 534,
    duelTipY: 560,
    actionDescY: 582,

    // Life panel dimensions (same style as other HUD panels)
    panelW: 194,
    panelH: 86,
    panelPad: 10,
    nameRowH: 22,
    iconSize: 16,
    iconGap: 4,

    // Action buttons (FIRE, DODGE) — first button centre x
    buttonXFirst: 296,
    buttonW: 164,
    buttonH: 46,
    buttonGap: 8,

    // Item chips (HUMO, ESPEJO, PLACA) — first chip centre x
    itemXFirst: 640,
    itemW: 164,
    itemH: 40,

    // Character arena — more vertical room with strip anchored at bottom
    arenaY: 295,
    characterMaxH: 460,
  },
} as const;

export const RESULT_LAYOUT = {
  panelCenterY: 360,
  panelW: 540,
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
  return Math.min(210, (screenWidth - 48 - gap * (count - 1)) / count);
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

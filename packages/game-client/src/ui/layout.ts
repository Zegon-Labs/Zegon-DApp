/** Native Phaser resolution — 16:9, 1.5× legacy 854×480 for sharper fullscreen scaling. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Keep HUD widgets inside these insets so FIT scaling never clips ornaments. */
export const HUD_SAFE = {
  top: 10,
  bottom: 8,
  side: 6,
} as const;

/** action_panel.png opaque width / height (see spriteActionBar). */
const ACTION_PANEL_SRC_W = 3318 - 44;
const ACTION_PANEL_SRC_H = 474;

/** Vertical centre for the bottom action strip — derived from panel height. */
export function actionPanelCenterY(screenWidth: number): number {
  const scale = screenWidth / ACTION_PANEL_SRC_W;
  const displayH = ACTION_PANEL_SRC_H * scale;
  return GAME_HEIGHT - HUD_SAFE.bottom - displayH / 2;
}

export function actionPanelTopY(screenWidth: number): number {
  const scale = screenWidth / ACTION_PANEL_SRC_W;
  const displayH = ACTION_PANEL_SRC_H * scale;
  return actionPanelCenterY(screenWidth) - displayH / 2;
}

/** Duel layout — HUD over landing bg + character. */
export const DUEL_LAYOUT = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  header: { logoY: 6, logoMaxW: 112 },

  prompt: { y: 84, w: 660, h: 66 },
  taunt: { y: 162, maxW: 750 },

  history: { x: 8, y: 14, w: 272, visibleRows: 5, pipGap: 6, pipSize: 9 },
  loadout: { gap: 10, gapAboveActions: 10, panelW: 236 },

  blindsight: {
    panelW: 210,
    panelH: 112,
    panelY: 14,
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

  roundToast: { x: 1180, y: 292, maxW: 300 },

  /** Top-right chrome — stacked hub buttons below blindsight panel. */
  chrome: {
    marginX: 18,
    skipY: 24,
    panelY: 138,
    buttonW: 210,
    buttonH: 38,
    buttonGap: 8,
  },

  /**
   * Unified bottom strip replacing the separate life-panels + action rows.
   * Life panels sit flush left/right inside the strip; all 5 action buttons
   * fill the centre zone in a single horizontal row.
   * Texts (status, choose-action, tip, desc) sit immediately above the strip.
   */
  bottomStrip: {
    // y / centerY are fallbacks — SpriteActionBar uses actionPanelCenterY() at runtime.
    y: 532,
    h: 88,
    centerY: 618,

    statusY: 418,
    chooseActionY: 442,

    panelW: 186,
    panelH: 82,
    panelPad: 10,
    nameRowH: 20,
    iconSize: 15,
    iconGap: 4,

    buttonXFirst: 296,
    buttonW: 164,
    buttonH: 46,
    buttonGap: 8,

    itemXFirst: 640,
    itemW: 164,
    itemH: 40,

    arenaY: 288,
    characterMaxH: 430,
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

export function loadoutPanelX(screenWidth: number, panelW: number): number {
  return screenWidth - HUD_SAFE.side - panelW;
}

export function loadoutPanelY(screenWidth: number, panelH: number): number {
  return actionPanelTopY(screenWidth) - DUEL_LAYOUT.loadout.gapAboveActions - panelH;
}

export function chromeButtonCenterX(screenWidth: number): number {
  const L = DUEL_LAYOUT;
  return screenWidth - L.chrome.marginX - L.chrome.buttonW / 2;
}

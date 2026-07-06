import Phaser from "phaser";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { addHubLogo } from "./landingBackdrop.js";

export const UTILITY_TABLE_KEY = "utility-table";
export const BUTTON_STATES_KEY = "btn-states";

export function preloadResultPanelAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(UTILITY_TABLE_KEY))
    scene.load.image(UTILITY_TABLE_KEY, "/sprites/utility_table.png");
  if (!scene.textures.exists(BUTTON_STATES_KEY))
    scene.load.spritesheet(BUTTON_STATES_KEY, "/sprites/button_states.png", {
      frameWidth: 991, frameHeight: 793,
    });
}

// ── Layout ──────────────────────────────────────────────────────────────────
const PANEL_W     = 520;
// Clearance to land content inside the inner BLACK zone of utility_table.png,
// past the decorative silver border.
const INNER_PAD_T = 65;
const INNER_PAD_B = 60;
const INNER_PAD_H = 30;
const INNER_W     = PANEL_W - INNER_PAD_H * 2;   // 460

const BTN_H       = 48;
const BTN_GAP     = 4;
// Narrower buttons so the sprite frame decoration is less stretched.
const BTN_W_FULL  = 400;
const BTN_W_HALF  = (BTN_W_FULL - BTN_GAP) / 2;  // 198

// Cap at 11 lines to exclude the "Cómo subir" tips section and keep the
// panel short enough to fit on a 720 px screen.
const MAX_STATS_LINES = 9;
const PROGRESS_SLOT_H = 44;

// ── Interfaces ───────────────────────────────────────────────────────────────
export interface HubResultPanelButton {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export interface HubResultPanelOptions {
  winnerLabel: string;
  winnerColor: string;
  statsText: string;
  verifyPlaceholder?: string;
  walletHint?: string;
  buttons: HubResultPanelButton[];
}

export interface HubResultPanelHandle {
  container: Phaser.GameObjects.Container;
  verifyLabel: Phaser.GameObjects.Text;
  dailyLabel: Phaser.GameObjects.Text;
  setVerifyText: (text: string) => void;
  destroy: () => void;
}

// ── Button helper ────────────────────────────────────────────────────────────
function addSpriteBtn(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  w: number,
  isPrimary = false,
): void {
  const normalFrame = 0;
  const activeFrame = 1;
  const startFrame  = isPrimary ? activeFrame : normalFrame;
  const hasSS = scene.textures.exists(BUTTON_STATES_KEY);

  if (hasSS) {
    const img = scene.add
      .image(x, y, BUTTON_STATES_KEY, startFrame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(w, BTN_H)
      .setInteractive({ useHandCursor: true });
    img
      .on("pointerover",  () => img.setFrame(activeFrame))
      .on("pointerout",   () => img.setFrame(startFrame))
      .on("pointerdown",  onClick);
    container.add(img);
  }

  const lbl = scene.add
    .text(x, y, label, {
      fontFamily: FONT_DISPLAY,
      fontSize: "11px",
      color: isPrimary ? COLORS.ember : "#cccccc",
      letterSpacing: 2,
    })
    .setOrigin(0.5, 0.5)
    .setResolution(2);

  if (!hasSS) lbl.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
  container.add(lbl);
}

// ── Factory ──────────────────────────────────────────────────────────────────
export function createHubResultPanel(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  options: HubResultPanelOptions,
): HubResultPanelHandle {
  // Trim stats to core lines (removes tips section that would overflow the frame)
  const rawLines = options.statsText.split("\n");
  const trimmedLines = rawLines.slice(0, MAX_STATS_LINES);
  while (trimmedLines.length && trimmedLines[trimmedLines.length - 1] === "") trimmedLines.pop();
  const statsShort = trimmedLines.join("\n");

  // Measure dynamic content heights using the exact same params as the real objects
  const statsMeasure = scene.add.text(0, 0, statsShort, {
    fontFamily: FONT, fontSize: "12px", lineSpacing: 0,
    align: "left", wordWrap: { width: INNER_W },
  });
  const statsH = statsMeasure.height;
  statsMeasure.destroy();

  let walletHintH = 0;
  if (options.walletHint) {
    const hm = scene.add.text(0, 0, options.walletHint, {
      fontFamily: FONT, fontSize: "12px", align: "center",
      wordWrap: { width: INNER_W - 20 },
    });
    walletHintH = hm.height;
    hm.destroy();
  }

  const LOGO_H   = 20;
  const WINNER_H = 28;

  const verifySample = `${options.verifyPlaceholder ?? "…"}\n0/0`;
  const verifyMeasure = scene.add.text(0, 0, verifySample, {
    fontFamily: FONT,
    fontSize: "12px",
    align: "center",
    wordWrap: { width: INNER_W - 20 },
    lineSpacing: 2,
  });
  const verifyH = verifyMeasure.height;
  verifyMeasure.destroy();

  const primaryBtns   = options.buttons.filter((b) =>  b.primary);
  const secondaryBtns = options.buttons.filter((b) => !b.primary);

  // Compute frame height from measured content
  let contentH = INNER_PAD_T;
  contentH += LOGO_H + 36;
  contentH += WINNER_H + 10;
  contentH += statsH + 10;
  if (options.walletHint) contentH += walletHintH + 5;
  contentH += verifyH + 6;
  contentH += PROGRESS_SLOT_H + 8;
  contentH += primaryBtns.length * (BTN_H + BTN_GAP);
  contentH += Math.ceil(secondaryBtns.length / 2) * (BTN_H + BTN_GAP);
  contentH += INNER_PAD_B;

  const maxPanelH = Math.min(scene.scale.height - 16, 760);
  const panelH = Math.min(contentH + 24, maxPanelH);
  const topY   = -panelH / 2;

  // ── Container ─────────────────────────────────────────────────────────────
  const container = scene.add.container(centerX, centerY).setDepth(10);

  if (scene.textures.exists(UTILITY_TABLE_KEY)) {
    container.add(
      scene.add
        .image(0, 0, UTILITY_TABLE_KEY)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(PANEL_W, panelH),
    );
  }

  // Cursor starts inside the inner black zone (past the decorative border)
  let y = topY + INNER_PAD_T;

  // Logo
  container.add(addHubLogo(scene, 0, y, 100, 11));
  y += LOGO_H + 36;

  // Winner label
  container.add(
    scene.add
      .text(0, y, options.winnerLabel, {
        fontFamily: FONT_DISPLAY,
        fontSize: "24px",
        color: options.winnerColor,
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setResolution(2),
  );
  y += WINNER_H + 10;

  // Stats block
  const statsText = scene.add
    .text(-INNER_W / 2 + 48, y, statsShort, {
      fontFamily: FONT,
      fontSize: "12px",
      color: COLORS.bone,
      align: "left",
      lineSpacing: 0,
      wordWrap: { width: INNER_W },
    })
    .setOrigin(0, 0)
    .setResolution(2);
  container.add(statsText);
  y += statsText.height + 10;

  // Wallet hint
  if (options.walletHint) {
    container.add(
      scene.add
        .text(0, y + walletHintH / 2, options.walletHint, {
          fontFamily: FONT,
          fontSize: "12px",
          color: COLORS.ember,
          align: "center",
          wordWrap: { width: INNER_W - 20 },
        })
        .setOrigin(0.5, 0.5)
        .setResolution(2),
    );
    y += walletHintH + 5;
  }

  // Verify + progression slots (must stay above buttons)
  const verifyLabel = scene.add
    .text(0, y, options.verifyPlaceholder ?? "…", {
      fontFamily: FONT,
      fontSize: "12px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: INNER_W - 20 },
      lineSpacing: 2,
    })
    .setOrigin(0.5, 0)
    .setResolution(2);
  container.add(verifyLabel);
  y += verifyLabel.height + 6;

  const dailyLabel = scene.add
    .text(0, y, "", {
      fontFamily: FONT,
      fontSize: "11px",
      color: COLORS.dust,
      align: "center",
      wordWrap: { width: INNER_W },
      lineSpacing: 2,
    })
    .setOrigin(0.5, 0)
    .setAlpha(0)
    .setResolution(2);
  container.add(dailyLabel);
  y += PROGRESS_SLOT_H + 8;

  // Primary buttons (full width, centered)
  for (const btn of primaryBtns) {
    addSpriteBtn(scene, container, 0, y + BTN_H / 2, btn.label, btn.onClick, BTN_W_FULL, true);
    y += BTN_H + BTN_GAP;
  }

  // Secondary buttons (2-column grid)
  for (let i = 0; i < secondaryBtns.length; i += 2) {
    const left  = secondaryBtns[i]!;
    const right = secondaryBtns[i + 1];
    const cy    = y + BTN_H / 2;
    if (right) {
      addSpriteBtn(scene, container, -(BTN_W_HALF / 2 + BTN_GAP / 2), cy, left.label,  left.onClick,  BTN_W_HALF);
      addSpriteBtn(scene, container,  (BTN_W_HALF / 2 + BTN_GAP / 2), cy, right.label, right.onClick, BTN_W_HALF);
    } else {
      addSpriteBtn(scene, container, 0, cy, left.label, left.onClick, BTN_W_FULL);
    }
    y += BTN_H + BTN_GAP;
  }

  return {
    container,
    verifyLabel,
    dailyLabel,
    setVerifyText: (text) => verifyLabel.setText(text),
    destroy: () => container.destroy(true),
  };
}

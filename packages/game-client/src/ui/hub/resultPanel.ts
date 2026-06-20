import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import {
  createHubAccentMenuButton,
  createHubMenuButton,
  type HubButtonHandle,
} from "./hubButton.js";
import { addHubLogo } from "./landingBackdrop.js";

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
  buttons: HubResultPanelButton[];
}

export interface HubResultPanelHandle {
  container: Phaser.GameObjects.Container;
  verifyLabel: Phaser.GameObjects.Text;
  dailyLabel: Phaser.GameObjects.Text;
  setVerifyText: (text: string) => void;
  destroy: () => void;
}

const PANEL_W = 310;
const PAD = 13;
const BTN_W = PANEL_W - PAD * 2;
const BTN_H = 40;
const BTN_GAP = 7;

function panelHeight(buttonCount: number): number {
  return (
    PAD * 2 +
    48 +
    8 +
    30 +
    6 +
    82 +
    10 +
    54 +
    10 +
    buttonCount * BTN_H +
    (buttonCount - 1) * BTN_GAP +
    8
  );
}

/** Unified result screen — same column layout as the React hub menu. */
export function createHubResultPanel(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  options: HubResultPanelOptions,
): HubResultPanelHandle {
  const panelH = panelHeight(options.buttons.length);
  const handles: HubButtonHandle[] = [];

  const container = scene.add.container(centerX, centerY).setDepth(10);

  const panelGfx = scene.add.graphics();
  panelGfx.fillStyle(C.smoke, 0.88);
  panelGfx.fillRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 2);
  panelGfx.lineStyle(1, C.fog, 0.95);
  panelGfx.strokeRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 2);
  panelGfx.lineStyle(1, C.blood, 0.35);
  panelGfx.strokeRoundedRect(
    -PANEL_W / 2 + 1,
    -panelH / 2 + 1,
    PANEL_W - 2,
    panelH - 2,
    2,
  );
  container.add(panelGfx);

  let y = -panelH / 2 + PAD;

  const logo = addHubLogo(scene, 0, y, 148, 11);
  container.add(logo);
  y += 48 + 8;

  container.add(
    scene.add.text(0, y, options.winnerLabel, {
      fontFamily: FONT_DISPLAY,
      fontSize: "26px",
      color: options.winnerColor,
      letterSpacing: 3,
    }).setOrigin(0.5, 0),
  );
  y += 30 + 6;

  container.add(
    scene.add.text(0, y, options.statsText, {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.bone,
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5, 0),
  );
  y += 82 + 10;

  const verifyCardH = 54;
  const verifyGfx = scene.add.graphics();
  verifyGfx.fillStyle(C.ash, 0.92);
  verifyGfx.fillRoundedRect(-BTN_W / 2, y, BTN_W, verifyCardH, 2);
  verifyGfx.lineStyle(1, C.blood, 0.35);
  verifyGfx.strokeRoundedRect(-BTN_W / 2, y, BTN_W, verifyCardH, 2);
  container.add(verifyGfx);

  const verifyLabel = scene.add.text(0, y + verifyCardH / 2, options.verifyPlaceholder ?? "…", {
    fontFamily: FONT,
    fontSize: "12px",
    color: COLORS.cyan,
    align: "center",
    wordWrap: { width: BTN_W - 16 },
    lineSpacing: 3,
  }).setOrigin(0.5, 0.5);
  container.add(verifyLabel);

  const dailyLabel = scene.add.text(0, y + verifyCardH + 4, "", {
    fontFamily: FONT,
    fontSize: "11px",
    color: COLORS.dust,
    align: "center",
    wordWrap: { width: BTN_W },
  }).setOrigin(0.5, 0).setAlpha(0);
  container.add(dailyLabel);

  y += verifyCardH + 10;

  options.buttons.forEach((btn) => {
    const cy = y + BTN_H / 2;
    const handle = btn.primary
      ? createHubAccentMenuButton(scene, 0, cy, btn.label, btn.onClick, BTN_W)
      : createHubMenuButton(scene, 0, cy, btn.label, btn.onClick, BTN_W);
    container.add(handle.container);
    handles.push(handle);
    y += BTN_H + BTN_GAP;
  });

  return {
    container,
    verifyLabel,
    dailyLabel,
    setVerifyText: (text: string) => verifyLabel.setText(text),
    destroy: () => {
      for (const h of handles) h.destroy();
      container.destroy(true);
    },
  };
}

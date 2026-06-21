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

const PANEL_W = 540;
const PAD = 16;
const BTN_H = 40;
const BTN_GAP = 8;
const INNER_W = PANEL_W - PAD * 2;
const BTN_COL_W = (INNER_W - BTN_GAP) / 2;

function drawPanelFrame(
  g: Phaser.GameObjects.Graphics,
  panelH: number,
): void {
  g.clear();
  g.fillStyle(C.smoke, 0.92);
  g.fillRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 4);
  g.lineStyle(1, C.fog, 0.95);
  g.strokeRoundedRect(-PANEL_W / 2, -panelH / 2, PANEL_W, panelH, 4);
  g.lineStyle(1, C.blood, 0.45);
  g.strokeRoundedRect(
    -PANEL_W / 2 + 1,
    -panelH / 2 + 1,
    PANEL_W - 2,
    panelH - 2,
    4,
  );
}

/** Wide rectangular result panel — dynamic height, no overlapping sections. */
export function createHubResultPanel(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  options: HubResultPanelOptions,
): HubResultPanelHandle {
  const handles: HubButtonHandle[] = [];
  const measureY = PAD;
  let contentH = measureY;

  contentH += 52;
  contentH += 34;

  const statsMeasure = scene.add.text(0, 0, options.statsText, {
    fontFamily: FONT,
    fontSize: "13px",
    lineSpacing: 4,
    wordWrap: { width: INNER_W },
  });
  const statsBlockH = statsMeasure.height + 12;
  statsMeasure.destroy();
  contentH += statsBlockH;

  let walletHintH = 0;
  if (options.walletHint) {
    const hintMeasure = scene.add.text(0, 0, options.walletHint, {
      fontFamily: FONT,
      fontSize: "12px",
      wordWrap: { width: INNER_W - 16 },
    });
    walletHintH = hintMeasure.height + 16;
    hintMeasure.destroy();
    contentH += walletHintH + 10;
  }

  const verifyCardH = 56;
  contentH += verifyCardH + 22;

  const primaryBtns = options.buttons.filter((b) => b.primary);
  const secondaryBtns = options.buttons.filter((b) => !b.primary);
  contentH += primaryBtns.length * (BTN_H + BTN_GAP);
  contentH += Math.ceil(secondaryBtns.length / 2) * (BTN_H + BTN_GAP);
  contentH += PAD;

  const panelH = contentH;
  const topY = -panelH / 2;

  const container = scene.add.container(centerX, centerY).setDepth(10);
  const panelGfx = scene.add.graphics();
  drawPanelFrame(panelGfx, panelH);
  container.add(panelGfx);

  let y = topY + PAD;

  const logo = addHubLogo(scene, 0, y, 132, 11);
  container.add(logo);
  y += 52;

  container.add(
    scene.add.text(0, y, options.winnerLabel, {
      fontFamily: FONT_DISPLAY,
      fontSize: "24px",
      color: options.winnerColor,
      letterSpacing: 3,
    }).setOrigin(0.5, 0),
  );
  y += 34;

  const statsText = scene.add.text(-INNER_W / 2, y, options.statsText, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.bone,
    align: "left",
    lineSpacing: 4,
    wordWrap: { width: INNER_W },
  }).setOrigin(0, 0);
  container.add(statsText);
  y += statsText.height + 12;

  if (options.walletHint) {
    const hintBg = scene.add.graphics();
    hintBg.fillStyle(C.ash, 0.95);
    hintBg.fillRoundedRect(-INNER_W / 2, y, INNER_W, walletHintH - 4, 3);
    hintBg.lineStyle(1, C.blood, 0.55);
    hintBg.strokeRoundedRect(-INNER_W / 2, y, INNER_W, walletHintH - 4, 3);
    container.add(hintBg);

    container.add(
      scene.add.text(0, y + (walletHintH - 4) / 2, options.walletHint, {
        fontFamily: FONT,
        fontSize: "12px",
        color: COLORS.ember,
        align: "center",
        wordWrap: { width: INNER_W - 20 },
      }).setOrigin(0.5, 0.5),
    );
    y += walletHintH + 6;
  }

  const verifyGfx = scene.add.graphics();
  verifyGfx.fillStyle(C.ash, 0.92);
  verifyGfx.fillRoundedRect(-INNER_W / 2, y, INNER_W, verifyCardH, 3);
  verifyGfx.lineStyle(1, C.blood, 0.35);
  verifyGfx.strokeRoundedRect(-INNER_W / 2, y, INNER_W, verifyCardH, 3);
  container.add(verifyGfx);

  const verifyLabel = scene.add.text(0, y + verifyCardH / 2, options.verifyPlaceholder ?? "…", {
    fontFamily: FONT,
    fontSize: "12px",
    color: COLORS.cyan,
    align: "center",
    wordWrap: { width: INNER_W - 20 },
    lineSpacing: 3,
  }).setOrigin(0.5, 0.5);
  container.add(verifyLabel);

  const dailyLabel = scene.add.text(0, y + verifyCardH + 6, "", {
    fontFamily: FONT,
    fontSize: "11px",
    color: COLORS.dust,
    align: "center",
    wordWrap: { width: INNER_W },
  }).setOrigin(0.5, 0).setAlpha(0);
  container.add(dailyLabel);

  y += verifyCardH + 14;

  for (const btn of primaryBtns) {
    const cy = y + BTN_H / 2;
    const handle = createHubAccentMenuButton(scene, 0, cy, btn.label, btn.onClick, INNER_W);
    container.add(handle.container);
    handles.push(handle);
    y += BTN_H + BTN_GAP;
  }

  for (let i = 0; i < secondaryBtns.length; i += 2) {
    const left = secondaryBtns[i]!;
    const right = secondaryBtns[i + 1];
    const cy = y + BTN_H / 2;

    if (right) {
      const leftHandle = createHubMenuButton(
        scene,
        -BTN_COL_W / 2 - BTN_GAP / 2,
        cy,
        left.label,
        left.onClick,
        BTN_COL_W,
      );
      const rightHandle = createHubMenuButton(
        scene,
        BTN_COL_W / 2 + BTN_GAP / 2,
        cy,
        right.label,
        right.onClick,
        BTN_COL_W,
      );
      container.add(leftHandle.container);
      container.add(rightHandle.container);
      handles.push(leftHandle, rightHandle);
    } else {
      const handle = createHubMenuButton(scene, 0, cy, left.label, left.onClick, INNER_W);
      container.add(handle.container);
      handles.push(handle);
    }
    y += BTN_H + BTN_GAP;
  }

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

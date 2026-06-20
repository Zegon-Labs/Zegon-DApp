import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { createHubPrimaryButton, createHubSecondaryButton } from "./hubButton.js";
import { createHubPanelGraphics } from "./hubPanel.js";
import { DUEL_LAYOUT as L, practiceStripCenterY } from "../layout.js";

export interface HubTutorialModalOptions {
  title?: string;
  body: string;
  badge?: string;
  buttonLabel: string;
  onDismiss: () => void;
  /** Center of panel on screen. Defaults to viewport center. */
  centerX?: number;
  centerY?: number;
  maxWidth?: number;
  depth?: number;
}

/** Full-screen dim + hub-styled readable modal. */
export function createHubTutorialModal(
  scene: Phaser.Scene,
  options: HubTutorialModalOptions,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const depth = options.depth ?? 120;
  const maxW = options.maxWidth ?? 480;
  const padX = 22;
  const padY = 18;
  const cx = options.centerX ?? width / 2;
  const cy = options.centerY ?? height / 2 - 10;

  const root = scene.add.container(0, 0).setDepth(depth);

  const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x030205, 0.78);
  dim.setInteractive({ useHandCursor: false });
  root.add(dim);

  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT,
    fontSize: "24px",
    color: COLORS.bone,
    wordWrap: { width: maxW - padX * 2 },
    lineSpacing: 8,
  }).setVisible(false);

  const badgeH = options.badge ? 16 : 0;
  const titleH = options.title ? 28 : 0;
  const bodyH = measureBody.height;
  const btnH = 44;
  const gap = 10;
  const panelH =
    padY + badgeH + (badgeH ? gap : 0) + titleH + (titleH ? gap : 0) + bodyH + gap + btnH + padY;
  measureBody.destroy();

  const panel = scene.add.container(cx, cy);
  const panelGfx = createHubPanelGraphics(scene, maxW, panelH);
  panel.add(panelGfx);

  let y = -panelH / 2 + padY;

  if (options.badge) {
    const badge = scene.add.text(-maxW / 2 + padX, y, options.badge, {
      fontFamily: FONT,
      fontSize: "18px",
      color: COLORS.dust,
      letterSpacing: 1,
    }).setOrigin(0, 0);
    panel.add(badge);
    y += badgeH + gap;
  }

  if (options.title) {
    const title = scene.add.text(0, y + titleH / 2, options.title, {
      fontFamily: FONT_DISPLAY,
      fontSize: "33px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: maxW - padX * 2 },
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5);
    panel.add(title);
    y += titleH + gap;
  }

  const body = scene.add.text(-maxW / 2 + padX, y, options.body, {
    fontFamily: FONT,
    fontSize: "24px",
    color: COLORS.bone,
    wordWrap: { width: maxW - padX * 2 },
    lineSpacing: 8,
  }).setOrigin(0, 0);
  panel.add(body);

  let dismissing = false;
  const btn = createHubPrimaryButton(scene, options.buttonLabel, () => {
    if (dismissing) return;
    dismissing = true;
    scene.tweens.add({
      targets: panel,
      alpha: 0,
      scaleX: 0.94,
      scaleY: 0.94,
      y: cy + 12,
      duration: 220,
      ease: "Sine.In",
      onComplete: () => {
        root.destroy(true);
        options.onDismiss();
      },
    });
  }, Math.min(200, maxW - padX * 2));
  btn.container.setPosition(0, panelH / 2 - padY - btnH / 2);
  panel.add(btn.container);

  root.add(panel);

  panel.setAlpha(0);
  panel.setScale(0.92);
  scene.tweens.add({
    targets: panel,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: 320,
    ease: "Back.out",
  });

  return root;
}

export interface HubConfirmModalOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  depth?: number;
}

/** Confirm / cancel dialog — e.g. surrender. */
export function createHubConfirmModal(
  scene: Phaser.Scene,
  options: HubConfirmModalOptions,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const depth = options.depth ?? 140;
  const maxW = 460;
  const padX = 22;
  const padY = 18;
  const cx = width / 2;
  const cy = height / 2 - 10;

  const root = scene.add.container(0, 0).setDepth(depth);

  const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x030205, 0.82);
  dim.setInteractive({ useHandCursor: false });
  root.add(dim);

  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT,
    fontSize: "24px",
    color: COLORS.bone,
    wordWrap: { width: maxW - padX * 2 },
    lineSpacing: 8,
  }).setVisible(false);

  const titleH = 33;
  const bodyH = measureBody.height;
  const btnH = 48;
  const btnGap = 10;
  const panelH = padY + titleH + 10 + bodyH + 14 + btnH + btnGap + btnH + padY;
  measureBody.destroy();

  const panel = scene.add.container(cx, cy);
  panel.add(createHubPanelGraphics(scene, maxW, panelH));

  panel.add(
    scene.add.text(0, -panelH / 2 + padY + titleH / 2, options.title, {
      fontFamily: FONT_DISPLAY,
      fontSize: "33px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: maxW - padX * 2 },
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5),
  );

  panel.add(
    scene.add.text(-maxW / 2 + padX, -panelH / 2 + padY + titleH + 10, options.body, {
      fontFamily: FONT,
      fontSize: "24px",
      color: COLORS.bone,
      wordWrap: { width: maxW - padX * 2 },
      lineSpacing: 8,
    }).setOrigin(0, 0),
  );

  const btnW = maxW - padX * 2;
  let dismissing = false;

  const dismiss = (then: () => void): void => {
    if (dismissing) return;
    dismissing = true;
    scene.tweens.add({
      targets: panel,
      alpha: 0,
      scaleX: 0.94,
      scaleY: 0.94,
      y: cy + 12,
      duration: 220,
      ease: "Sine.In",
      onComplete: () => {
        root.destroy(true);
        then();
      },
    });
  };

  const confirmBtn = createHubPrimaryButton(scene, options.confirmLabel, () => {
    dismiss(options.onConfirm);
  }, btnW);
  confirmBtn.container.setPosition(0, panelH / 2 - padY - btnH - btnGap - btnH / 2);
  panel.add(confirmBtn.container);

  const cancelBtn = createHubSecondaryButton(scene, options.cancelLabel, () => {
    dismiss(options.onCancel);
  }, btnW);
  cancelBtn.container.setPosition(0, panelH / 2 - padY - btnH / 2);
  panel.add(cancelBtn.container);

  root.add(panel);
  panel.setAlpha(0);
  panel.setScale(0.92);
  scene.tweens.add({
    targets: panel,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: 320,
    ease: "Back.out",
  });

  return root;
}

/** Compact instruction strip above the action bar during practice. */
export function createHubPracticeStrip(
  scene: Phaser.Scene,
  options: { badge: string; body: string; buttonLabel: string; onDismiss: () => void },
  depth = 55,
): Phaser.GameObjects.Container {
  const { width } = scene.scale;
  const maxW = Math.min(780, width - 48);
  const padX = 20;
  const padY = 14;
  const cx = width / 2;

  const root = scene.add.container(0, 0).setDepth(depth);
  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT,
    fontSize: "22px",
    color: COLORS.bone,
    wordWrap: { width: maxW - padX * 2 - 180 },
    lineSpacing: 6,
  }).setVisible(false);

  const panelH = Math.max(96, measureBody.height + padY * 2 + 12);
  measureBody.destroy();
  const cy = practiceStripCenterY(panelH);

  const panel = scene.add.container(cx, cy);
  panel.add(createHubPanelGraphics(scene, maxW, panelH));

  panel.add(
    scene.add.text(-maxW / 2 + padX, -panelH / 2 + padY, options.badge, {
      fontFamily: FONT,
      fontSize: "17px",
      color: COLORS.dust,
    }).setOrigin(0, 0),
  );

  panel.add(
    scene.add.text(-maxW / 2 + padX, -panelH / 2 + padY + 20, options.body, {
      fontFamily: FONT,
      fontSize: "22px",
      color: COLORS.bone,
      wordWrap: { width: maxW - padX * 2 - 190 },
      lineSpacing: 6,
    }).setOrigin(0, 0),
  );

  const btn = createHubPrimaryButton(scene, options.buttonLabel, () => {
    scene.tweens.add({
      targets: panel,
      alpha: 0,
      y: cy - 16,
      duration: 180,
      onComplete: () => {
        root.destroy(true);
        options.onDismiss();
      },
    });
  }, 120);
  btn.container.setPosition(maxW / 2 - padX - 62, 0);
  panel.add(btn.container);

  root.add(panel);
  panel.setAlpha(0);
  panel.setY(cy - 20);
  scene.tweens.add({ targets: panel, alpha: 1, y: cy, duration: 280, ease: "Back.out" });

  return root;
}

export function createHubPromptBar(
  scene: Phaser.Scene,
  depth = 10,
): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text } {
  const { width } = scene.scale;
  const w = Math.min(L.prompt.w, width - 48);
  const h = L.prompt.h;
  const x = (width - w) / 2;
  const y = L.prompt.y;

  const bg = scene.add.rectangle(w / 2, h / 2, w, h, C.ash, 0.88);
  bg.setStrokeStyle(1, C.blood, 0.55);

  const text = scene.add.text(w / 2, h / 2, "", {
    fontFamily: FONT_DISPLAY,
    fontSize: "26px",
    color: COLORS.bone,
    align: "center",
    wordWrap: { width: w - 36 },
    letterSpacing: 1,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  return { container, text };
}

import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { createHubPrimaryButton } from "./hubButton.js";
import { createHubPanelGraphics } from "./hubPanel.js";
import { UTILITY_TABLE_KEY, BUTTON_STATES_KEY } from "./resultPanel.js";
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
  const depth     = options.depth ?? 120;
  const PANEL_W   = options.maxWidth ?? 480;
  const INNER_PAD_T = 65;  // clears utility_table's top silver border
  const INNER_PAD_B = 55;
  const INNER_PAD_H = 30;
  const INNER_W   = PANEL_W - INNER_PAD_H * 2;
  const BTN_H     = 52;
  const BTN_W     = 400;
  const BADGE_H   = options.badge ? 18 : 0;
  const BADGE_GAP = options.badge ? 8  : 0;
  const TITLE_H   = options.title ? 34 : 0;
  const TITLE_GAP = options.title ? 12 : 0;
  const cx = options.centerX ?? width  / 2;
  const cy = options.centerY ?? height / 2 - 10;

  // Measure body height before building the panel so panelH is exact.
  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT, fontSize: "16px",
    wordWrap: { width: INNER_W }, lineSpacing: 4,
  }).setVisible(false);
  const bodyH = measureBody.height;
  measureBody.destroy();

  const panelH = Math.min(
    INNER_PAD_T + BADGE_H + BADGE_GAP + TITLE_H + TITLE_GAP + bodyH + 20 + BTN_H + INNER_PAD_B,
    660,
  );

  const root = scene.add.container(0, 0).setDepth(depth);
  const dim  = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x030205, 0.78)
    .setInteractive({ useHandCursor: false });
  root.add(dim);

  const panel = scene.add.container(cx, cy);

  // ── Background: utility_table ─────────────────────────────────────────────
  if (scene.textures.exists(UTILITY_TABLE_KEY)) {
    panel.add(
      scene.add.image(0, 0, UTILITY_TABLE_KEY)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(PANEL_W, panelH),
    );
  } else {
    panel.add(createHubPanelGraphics(scene, PANEL_W, panelH));
  }

  let y = -panelH / 2 + INNER_PAD_T;

  // ── Badge (e.g. "TIP · Lección 1/9") ─────────────────────────────────────
  if (options.badge) {
    panel.add(
      scene.add.text(-INNER_W / 2, y, options.badge, {
        fontFamily: FONT, fontSize: "14px",
        color: COLORS.dust, letterSpacing: 1,
      }).setOrigin(0, 0).setResolution(2),
    );
    y += BADGE_H + BADGE_GAP;
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  if (options.title) {
    panel.add(
      scene.add.text(0, y + TITLE_H / 2, options.title, {
        fontFamily: FONT_DISPLAY, fontSize: "28px",
        color: COLORS.ember, align: "center",
        wordWrap: { width: INNER_W }, letterSpacing: 2,
      }).setOrigin(0.5, 0.5).setResolution(2),
    );
    y += TITLE_H + TITLE_GAP;
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  panel.add(
    scene.add.text(0, y, options.body, {
      fontFamily: FONT, fontSize: "16px",
      color: COLORS.bone, align: "center",
      wordWrap: { width: INNER_W }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setResolution(2),
  );
  y += bodyH + 20;

  // ── Button ────────────────────────────────────────────────────────────────
  let dismissing = false;
  const onDismiss = (): void => {
    if (dismissing) return;
    dismissing = true;
    scene.tweens.add({
      targets: panel,
      alpha: 0, scaleX: 0.94, scaleY: 0.94, y: cy + 12,
      duration: 220, ease: "Sine.In",
      onComplete: () => { root.destroy(true); options.onDismiss(); },
    });
  };

  const btnY = y + BTN_H / 2;
  if (scene.textures.exists(BUTTON_STATES_KEY)) {
    const img = scene.add
      .image(0, btnY, BUTTON_STATES_KEY, 1)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(BTN_W, BTN_H)
      .setInteractive({ useHandCursor: true });
    img
      .on("pointerover",  () => img.setFrame(1))
      .on("pointerout",   () => img.setFrame(1))
      .on("pointerdown",  onDismiss);
    panel.add(img);
  }
  panel.add(
    scene.add.text(0, btnY, options.buttonLabel, {
      fontFamily: FONT_DISPLAY, fontSize: "11px",
      color: COLORS.ember, letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setResolution(2),
  );

  root.add(panel);
  panel.setAlpha(0).setScale(0.92);
  scene.tweens.add({
    targets: panel, alpha: 1, scaleX: 1, scaleY: 1,
    duration: 320, ease: "Back.out",
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
  const depth  = options.depth ?? 140;
  const PANEL_W  = 480;
  const INNER_PAD_H = 30;
  const INNER_W  = PANEL_W - INNER_PAD_H * 2;  // 420
  const INNER_PAD_T = 65;   // clears utility_table's top silver border
  const INNER_PAD_B = 55;
  const BTN_H   = 52;
  const BTN_GAP = 8;
  const BTN_W   = 400;
  const cx = width / 2;
  const cy = height / 2;

  // Measure body height with the actual font/wrap settings
  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT, fontSize: "16px",
    wordWrap: { width: INNER_W }, lineSpacing: 4,
  }).setVisible(false);
  const bodyH   = measureBody.height;
  const TITLE_H = 34;
  measureBody.destroy();

  const panelH = Math.min(
    INNER_PAD_T + TITLE_H + 16 + bodyH + 20 + BTN_H + BTN_GAP + BTN_H + INNER_PAD_B,
    600,
  );

  const root  = scene.add.container(0, 0).setDepth(depth);
  const dim   = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x030205, 0.82)
    .setInteractive({ useHandCursor: false });
  root.add(dim);

  const panel = scene.add.container(cx, cy);

  // ── Background: utility_table ─────────────────────────────────────────────
  if (scene.textures.exists(UTILITY_TABLE_KEY)) {
    panel.add(
      scene.add.image(0, 0, UTILITY_TABLE_KEY)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(PANEL_W, panelH),
    );
  }

  const topY = -panelH / 2;
  let y = topY + INNER_PAD_T;

  // ── Title ─────────────────────────────────────────────────────────────────
  panel.add(
    scene.add.text(0, y + TITLE_H / 2, options.title, {
      fontFamily: FONT_DISPLAY,
      fontSize:   "28px",
      color:      COLORS.ember,
      align:      "center",
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setResolution(2),
  );
  y += TITLE_H + 16;

  // ── Body ──────────────────────────────────────────────────────────────────
  panel.add(
    scene.add.text(0, y, options.body, {
      fontFamily: FONT,
      fontSize:   "16px",
      color:      COLORS.bone,
      align:      "center",
      wordWrap:   { width: INNER_W },
      lineSpacing: 4,
    }).setOrigin(0.5, 0).setResolution(2),
  );
  y += bodyH + 20;

  // ── Buttons ───────────────────────────────────────────────────────────────
  const hasSS = scene.textures.exists(BUTTON_STATES_KEY);
  let dismissing = false;

  const dismiss = (then: () => void): void => {
    if (dismissing) return;
    dismissing = true;
    scene.tweens.add({
      targets: panel,
      alpha: 0, scaleX: 0.94, scaleY: 0.94, y: cy + 12,
      duration: 220, ease: "Sine.In",
      onComplete: () => { root.destroy(true); then(); },
    });
  };

  const addBtn = (
    btnY: number, label: string, isPrimary: boolean, onClick: () => void,
  ): void => {
    if (hasSS) {
      const startFrame = isPrimary ? 1 : 0;
      const img = scene.add
        .image(0, btnY, BUTTON_STATES_KEY, startFrame)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(BTN_W, BTN_H)
        .setInteractive({ useHandCursor: true });
      img
        .on("pointerover",  () => img.setFrame(1))
        .on("pointerout",   () => img.setFrame(startFrame))
        .on("pointerdown",  onClick);
      panel.add(img);
    }
    panel.add(
      scene.add.text(0, btnY, label, {
        fontFamily: FONT_DISPLAY,
        fontSize:   "11px",
        color:      isPrimary ? COLORS.ember : "#cccccc",
        letterSpacing: 2,
      }).setOrigin(0.5, 0.5).setResolution(2),
    );
    if (!hasSS) {
      const hit = scene.add.rectangle(0, btnY, BTN_W, BTN_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", onClick);
      panel.add(hit);
    }
  };

  addBtn(y + BTN_H / 2, options.confirmLabel, true,  () => dismiss(options.onConfirm));
  addBtn(y + BTN_H + BTN_GAP + BTN_H / 2, options.cancelLabel, false, () => dismiss(options.onCancel));

  root.add(panel);
  panel.setAlpha(0).setScale(0.92);
  scene.tweens.add({
    targets: panel, alpha: 1, scaleX: 1, scaleY: 1,
    duration: 320, ease: "Back.out",
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

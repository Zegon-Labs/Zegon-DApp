import Phaser from "phaser";
import { TUTORIAL_BUBBLE } from "./layout.js";
import { C, COLORS, FONT } from "./theme.js";

export function drawScanlines(
  scene: Phaser.Scene,
  depth = 100,
  alpha = 0.06,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth).setAlpha(alpha);
  const { width, height } = scene.scale;
  g.lineStyle(1, C.fog, 0.35);
  for (let y = 0; y < height; y += 4) {
    g.lineBetween(0, y, width, y);
  }
  return g;
}

/** Soft vignette when ZEGON's read streak rises — prefer ReadingTensionLayer in scenes. */
export function drawBlindsightTensionOverlay(
  scene: Phaser.Scene,
  intensity: number,
  depth = 99,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(depth);
  container.setAlpha(intensity > 0.02 ? 0.2 + intensity * 0.4 : 0);
  return container;
}

/** @deprecated Use drawBlindsightTensionOverlay — kept for imports that still reference it. */
export function drawGlitchOverlay(
  scene: Phaser.Scene,
  intensity: number,
  depth = 99,
): Phaser.GameObjects.Container {
  return drawBlindsightTensionOverlay(scene, intensity, depth);
}

/** Scanline alpha — rises gently with blindsight. */
export function scanlineAlphaForBlindsight(blindsight: number): number {
  return 0.04 + (blindsight / 100) * 0.12;
}

/** Pulse scanline opacity — static when enabled; no breathing overlay. */
export function scanlinePulseAlpha(
  blindsight: number,
  _phase: number,
  scanlinesEnabled = true,
): number {
  if (!scanlinesEnabled) return 0;
  return 0.035 + (blindsight / 100) * 0.04;
}

/** Disabled — full-screen ember wash removed in favour of scope tension FX. */
export function blindsightBlinkAlpha(_blindsight: number, _phase: number): number {
  return 0;
}

export interface BlindsightShakeParams {
  intervalMs: number;
  durationMs: number;
  intensity: number;
}

/** Periodic camera shake — only at high blindsight, gentle cadence. */
export function blindsightShakeParams(blindsight: number): BlindsightShakeParams | null {
  if (blindsight < 52) return null;
  const t = (blindsight - 52) / 48;
  return {
    intervalMs: 2400 - t * 1100,
    durationMs: 70 + t * 80,
    intensity: 0.001 + t * 0.0022,
  };
}

/** One-shot surge when blindsight rises — felt but not punishing. */
export function blindsightSurgeStrength(delta: number): number {
  return Math.min(0.7, Math.max(0, delta / 28));
}

export interface CenterPopupOptions {
  title: string;
  body: string;
  subtitle?: string;
  buttonLabel: string;
  onContinue: () => void;
  secondButton?: { label: string; onClick: () => void };
  depth?: number;
}

export function createCenterPopup(
  scene: Phaser.Scene,
  options: CenterPopupOptions,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const depth = options.depth ?? 50;
  const container = scene.add.container(0, 0).setDepth(depth);

  const dim = scene.add.rectangle(width / 2, height / 2, width, height, C.void, 0.93);
  dim.setInteractive({ useHandCursor: false });

  const panelW = 468;
  const panelH = 300;
  const cx = width / 2;
  const cy = height / 2;

  const panel = scene.add.rectangle(cx, cy, panelW, panelH, C.ash, 0.98);
  panel.setStrokeStyle(2, C.cyan);

  const titleText = scene.add.text(cx, cy - panelH / 2 + 36, options.title, {
    fontFamily: FONT,
    fontSize: "22px",
    color: COLORS.cyan,
    align: "center",
    wordWrap: { width: panelW - 40 },
  }).setOrigin(0.5);

  const subtitleText = options.subtitle
    ? scene.add.text(cx, cy - panelH / 2 + 62, options.subtitle, {
        fontFamily: FONT,
        fontSize: "12px",
        color: COLORS.dust,
      }).setOrigin(0.5)
    : null;

  const bodyY = subtitleText ? cy - panelH / 2 + 88 : cy - panelH / 2 + 72;
  const bodyText = scene.add.text(cx, bodyY, options.body, {
    fontFamily: FONT,
    fontSize: "14px",
    color: COLORS.bone,
    align: "center",
    wordWrap: { width: panelW - 48 },
    lineSpacing: 5,
  }).setOrigin(0.5, 0);

  const btn = createMenuButton(
    scene,
    cx,
    cy + panelH / 2 - (options.secondButton ? 52 : 36),
    options.buttonLabel,
    options.onContinue,
  );

  container.add([dim, panel, titleText, bodyText, btn]);
  if (subtitleText) container.add(subtitleText);

  if (options.secondButton) {
    const btn2 = createMenuButton(
      scene,
      cx,
      cy + panelH / 2 - 4,
      options.secondButton.label,
      options.secondButton.onClick,
    );
    container.add(btn2);
  }

  container.setAlpha(0);
  scene.tweens.add({ targets: container, alpha: 1, duration: 180, ease: "Sine.Out" });

  return container;
}

export interface TutorialBubbleOptions {
  title?: string;
  body: string;
  badge?: string;
  buttonLabel: string;
  onDismiss: () => void;
  x: number;
  y: number;
  depth?: number;
  /** 'slide' from left (default) or 'fade' in place — use fade for centered finish screens. */
  entrance?: "slide" | "fade";
}

function paintTutorialPanel(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
): void {
  const hw = w / 2;
  const hh = h / 2;
  const r = 10;

  g.clear();
  g.fillStyle(C.ash, 0.98);
  g.lineStyle(2, C.cyan, 1);
  g.fillRoundedRect(-hw, -hh, w, h, r);
  g.strokeRoundedRect(-hw, -hh, w, h, r);
}

function createBubbleOkButton(
  scene: Phaser.Scene,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "20px",
    color: COLORS.bone,
  }).setOrigin(0.5);

  const w = Math.max(92, text.width + 28);
  const h = 28;
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.95);
  bg.setStrokeStyle(2, C.cyan);

  const btn = scene.add.container(0, 0, [bg, text]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => {
    bg.setFillStyle(C.fog, 0.95);
    text.setColor(COLORS.cyan);
  });
  bg.on("pointerout", () => {
    bg.setFillStyle(C.smoke, 0.95);
    text.setColor(COLORS.bone);
  });
  bg.on("pointerdown", () => {
    bg.setFillStyle(C.void, 0.95);
    text.setColor(COLORS.cyan);
  });
  bg.on("pointerup", onClick);
  return btn;
}

/** Small tutorial panel — slides in, exits left on OK. */
export function createTutorialBubble(
  scene: Phaser.Scene,
  options: TutorialBubbleOptions,
): Phaser.GameObjects.Container {
  const depth = options.depth ?? 55;
  const panelW = TUTORIAL_BUBBLE.maxW;
  const padX = 16;
  const padY = 12;

  const measureBody = scene.add.text(0, 0, options.body, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.bone,
    wordWrap: { width: panelW - padX * 2 },
    lineSpacing: 4,
  }).setVisible(false);

  let contentY = -padY;
  const badgeH = options.badge ? 14 : 0;
  const titleH = options.title ? 20 : 0;
  const bodyH = measureBody.height;
  const btnH = 28;
  const gap = 6;
  const panelH =
    padY + badgeH + (badgeH ? gap : 0) + titleH + (titleH ? gap : 0) + bodyH + gap + btnH + padY;

  measureBody.destroy();

  const container = scene.add.container(options.x, options.y).setDepth(depth);
  const panelGfx = scene.add.graphics();
  paintTutorialPanel(panelGfx, panelW, panelH);
  container.add(panelGfx);

  contentY = -panelH / 2 + padY;

  if (options.badge) {
    const badge = scene.add.text(-panelW / 2 + padX, contentY, options.badge, {
      fontFamily: FONT,
      fontSize: "11px",
      color: COLORS.dust,
    }).setOrigin(0, 0);
    container.add(badge);
    contentY += badgeH + gap;
  }

  if (options.title) {
    const title = scene.add.text(-panelW / 2 + padX, contentY, options.title, {
      fontFamily: FONT,
      fontSize: "16px",
      color: COLORS.cyan,
      align: "left",
      wordWrap: { width: panelW - padX * 2 },
    }).setOrigin(0, 0);
    container.add(title);
    contentY += titleH + gap;
  }

  const body = scene.add.text(-panelW / 2 + padX, contentY, options.body, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.bone,
    wordWrap: { width: panelW - padX * 2 },
    lineSpacing: 4,
  }).setOrigin(0, 0);
  container.add(body);

  let dismissing = false;
  const btnY = panelH / 2 - padY - btnH / 2;
  const okBtn = createBubbleOkButton(scene, options.buttonLabel, () => {
    if (dismissing) return;
    dismissing = true;
    scene.tweens.add({
      targets: container,
      x: -panelW,
      alpha: 0,
      scaleX: 0.88,
      scaleY: 0.88,
      angle: -6,
      duration: 300,
      ease: "Back.in",
      onComplete: () => {
        container.destroy(true);
        options.onDismiss();
      },
    });
  });
  const btnBg = okBtn.list[0] as Phaser.GameObjects.Rectangle;
  okBtn.setPosition(panelW / 2 - padX - btnBg.width / 2, btnY);
  container.add(okBtn);

  const entrance = options.entrance ?? "slide";
  if (entrance === "fade") {
    container.setPosition(options.x, options.y);
    container.setAlpha(0);
    container.setScale(0.94);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: "Sine.Out",
    });
  } else {
    const enterFromX = -panelW - 40;
    container.setPosition(enterFromX, options.y);
    container.setAlpha(0);
    container.setScale(0.92);
    scene.tweens.add({
      targets: container,
      x: options.x,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 340,
      ease: "Back.out",
    });
  }

  return container;
}

export function createFloatingPopup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 12,
): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
  const bg = scene.add.rectangle(0, 0, w, h, C.ash, 0.96);
  bg.setStrokeStyle(2, C.cyan);
  const text = scene.add.text(0, 0, "", {
    fontFamily: FONT,
    fontSize: "12px",
    color: COLORS.bone,
    align: "center",
    wordWrap: { width: w - 24 },
    lineSpacing: 3,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  container.setVisible(false);
  return { container, bg, text };
}

export function practicePopupY(actionsY: number, actionH: number, popupH: number, gap = 14): number {
  return actionsY - actionH / 2 - gap - popupH / 2;
}

export function drawDesertBackdrop(
  scene: Phaser.Scene,
  intensity = 0,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(0);

  const sky = scene.add.rectangle(width / 2, height * 0.35, width, height * 0.7, C.void);
  const horizon = scene.add.rectangle(width / 2, height * 0.62, width, height * 0.5, 0x1a0810);
  const ground = scene.add.rectangle(width / 2, height * 0.82, width, height * 0.4, 0x120a0e);

  const sun = scene.add.circle(width / 2, height * 0.38, 90, C.blood, 0.25 + intensity * 0.35);

  const mesaLeft = scene.add.triangle(
    width * 0.18, height * 0.58, 0, 40, 50, 0, 100, 40, 0x0d080c, 1,
  );
  const mesaRight = scene.add.triangle(
    width * 0.82, height * 0.55, 0, 50, 60, 0, 120, 50, 0x0d080c, 1,
  );

  container.add([sky, horizon, ground, sun, mesaLeft, mesaRight]);
  return container;
}

export function drawZegonFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  blindsight: number,
  deadeye = false,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(5);
  const glow = 0.4 + (blindsight / 100) * 0.6;

  const body = scene.add.rectangle(0, 30, 70, 100, C.ash);
  const coat = scene.add.triangle(0, 35, -55, -20, 55, -20, 0, 90, C.void, 0.95);
  const hat = scene.add.ellipse(0, -45, 90, 22, C.void);
  const hatTop = scene.add.rectangle(0, -58, 44, 28, C.void);
  const bandage = scene.add.rectangle(0, -18, 36, 50, C.smoke);
  const eye = scene.add.rectangle(0, -18, 4, 36, deadeye ? C.ember : C.blood, glow);

  container.add([body, coat, hat, hatTop, bandage, eye]);

  if (blindsight > 50) {
    const crack = scene.add.graphics();
    crack.lineStyle(2, C.ember, glow);
    crack.lineBetween(-2, -34, 2, -2);
    container.add(crack);
  }

  return container;
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 10,
): Phaser.GameObjects.Container {
  const bg = scene.add.rectangle(w / 2, h / 2, w, h, C.ash, 0.92);
  bg.setStrokeStyle(1, C.fog);
  return scene.add.container(x, y, [bg]).setDepth(depth);
}

export function createPromptPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 10,
): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text } {
  const bg = scene.add.rectangle(w / 2, h / 2, w, h, C.ash, 0.92);
  bg.setStrokeStyle(1, C.fog);
  const text = scene.add.text(w / 2, h / 2, "", {
    fontFamily: FONT,
    fontSize: "18px",
    color: COLORS.cyan,
    align: "center",
    wordWrap: { width: w - 24 },
  }).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  return { container, text };
}

export function createLabeledPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  depth = 10,
): { container: Phaser.GameObjects.Container; body: Phaser.GameObjects.Text } {
  const panel = createPanel(scene, x, y, w, h, depth);
  const titleText = scene.add.text(10, 6, title, {
    fontFamily: FONT,
    fontSize: "14px",
    color: COLORS.ember,
  });
  const body = scene.add.text(10, 26, "", {
    fontFamily: FONT,
    fontSize: "15px",
    color: COLORS.dust,
    lineSpacing: 3,
  });
  panel.add([titleText, body]);
  return { container: panel, body };
}

export interface ActionButtonHandle {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  setEnabled: (enabled: boolean) => void;
  setLabel: (label: string) => void;
  setDimmed: (dimmed: boolean) => void;
  resetHover: () => void;
}

export function createActionButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  depth = 10,
  onHover?: (active: boolean) => void,
): ActionButtonHandle {
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.95);
  bg.setStrokeStyle(1, C.fog);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.bone,
    align: "center",
    wordWrap: { width: w - 8 },
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  let enabled = true;
  let hovering = false;
  let dimmed = false;

  const applyStyle = (): void => {
    scene.tweens.killTweensOf(bg);

    if (!enabled) {
      bg.setStrokeStyle(1, C.fog);
      bg.setFillStyle(C.ash, 0.55);
      text.setColor(COLORS.dust);
      bg.setAlpha(dimmed ? 0.35 : 0.5);
      text.setAlpha(dimmed ? 0.35 : 0.5);
      bg.setScale(1);
      return;
    }

    bg.setAlpha(dimmed ? 0.35 : 1);
    text.setAlpha(dimmed ? 0.35 : 1);

    if (hovering) {
      bg.setStrokeStyle(2, C.cyan);
      bg.setFillStyle(C.blood, 0.22);
      text.setColor(COLORS.cyan);
    } else {
      bg.setStrokeStyle(1, C.fog);
      bg.setFillStyle(C.smoke, 0.95);
      text.setColor(COLORS.bone);
      bg.setScale(1);
    }
  };

  bg.setInteractive({ useHandCursor: true });

  bg.on("pointerover", () => {
    if (!enabled || dimmed) return;
    hovering = true;
    applyStyle();
    scene.tweens.add({
      targets: bg,
      scaleX: 1.05,
      scaleY: 1.1,
      duration: 90,
      ease: "Sine.Out",
    });
    onHover?.(true);
  });

  bg.on("pointerout", () => {
    hovering = false;
    scene.tweens.add({
      targets: bg,
      scaleX: 1,
      scaleY: 1,
      duration: 110,
      ease: "Sine.In",
      onComplete: () => applyStyle(),
    });
    if (!hovering) applyStyle();
    onHover?.(false);
  });

  bg.on("pointerdown", () => {
    if (!enabled || dimmed) return;
    scene.tweens.add({
      targets: bg,
      scaleX: 0.94,
      scaleY: 0.88,
      duration: 55,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => {
        if (hovering) {
          bg.setScale(1.05, 1.1);
        } else {
          bg.setScale(1);
        }
      },
    });
    onClick();
  });

  const handle: ActionButtonHandle = {
    container,
    bg,
    text,
    setEnabled(next: boolean) {
      enabled = next;
      if (!next) {
        hovering = false;
        bg.disableInteractive();
        scene.tweens.killTweensOf(bg);
        bg.setScale(1);
      } else if (!dimmed) {
        bg.setInteractive({ useHandCursor: true });
      }
      applyStyle();
    },
    setLabel(next: string) {
      text.setText(next);
    },
    setDimmed(next: boolean) {
      dimmed = next;
      if (dimmed) {
        hovering = false;
        scene.tweens.killTweensOf(bg);
        bg.setScale(1);
      }
      applyStyle();
    },
    resetHover() {
      hovering = false;
      scene.tweens.killTweensOf(bg);
      bg.setScale(1);
      applyStyle();
    },
  };

  applyStyle();
  return handle;
}

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
): Phaser.GameObjects.Container {
  const w = width;
  const h = 42;
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.95);
  bg.setStrokeStyle(2, C.blood);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "26px",
    color: COLORS.bone,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => {
    bg.setFillStyle(C.blood, 0.35);
    bg.setStrokeStyle(2, C.cyan);
    text.setColor(COLORS.cyan);
  });
  bg.on("pointerout", () => {
    bg.setFillStyle(C.smoke, 0.95);
    bg.setStrokeStyle(2, C.blood);
    text.setColor(COLORS.bone);
  });
  bg.on("pointerdown", onClick);
  return container;
}

export function createAccentMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const w = 260;
  const h = 42;
  const bg = scene.add.rectangle(0, 0, w, h, C.blood, 0.25);
  bg.setStrokeStyle(2, C.cyan);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "26px",
    color: COLORS.cyan,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true });
  bg.on("pointerover", () => {
    bg.setFillStyle(C.cyan, 0.2);
    text.setColor(COLORS.bone);
  });
  bg.on("pointerout", () => {
    bg.setFillStyle(C.blood, 0.25);
    text.setColor(COLORS.cyan);
  });
  bg.on("pointerdown", onClick);
  return container;
}

export function createSmallButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, label, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.link,
    backgroundColor: "#1a1520",
    padding: { x: 8, y: 4 },
  }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

  text.on("pointerover", () => text.setColor(COLORS.linkHover));
  text.on("pointerout", () => text.setColor(COLORS.link));
  text.on("pointerdown", onClick);
  return text;
}

export function drawBlindsightMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
): void {
  const fill = (value / 100) * w;
  g.clear();
  g.fillStyle(C.smoke, 0.95);
  g.fillRect(x, y, w, h);
  g.fillStyle(C.ember, 1);
  g.fillRect(x, y, fill, h);
  g.lineStyle(1, C.fog, 1);
  g.strokeRect(x, y, w, h);
}

export function drawHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
  color: number,
): void {
  const ratio = Math.max(0, Math.min(1, current / max));
  g.fillStyle(C.smoke, 0.9);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, 1);
  g.fillRect(x, y, w * ratio, h);
  g.lineStyle(1, C.fog, 1);
  g.strokeRect(x, y, w, h);
}

export function drawDivider(scene: Phaser.Scene, y: number): void {
  const { width } = scene.scale;
  const g = scene.add.graphics().setDepth(4);
  g.lineStyle(1, C.fog, 0.5);
  g.lineBetween(24, y, width - 24, y);
}

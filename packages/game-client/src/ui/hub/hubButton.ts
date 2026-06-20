import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L } from "../layout.js";

export interface HubButtonHandle {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}

/** Primary hub-style button with idle pulse and blood/ember hover. */
export function createHubPrimaryButton(
  scene: Phaser.Scene,
  label: string,
  onClick: () => void,
  width = 168,
): HubButtonHandle {
  const h = 48;
  const bg = scene.add.rectangle(0, 0, width, h, C.blood, 0.45);
  bg.setStrokeStyle(2, C.ember, 0.75);

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT_DISPLAY,
    fontSize: "24px",
    color: COLORS.bone,
    letterSpacing: 2,
  }).setOrigin(0.5);

  const container = scene.add.container(0, 0, [bg, text]);
  let enabled = true;

  const idlePulse = scene.tweens.add({
    targets: bg,
    scaleX: 1.03,
    scaleY: 1.06,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  bg.setInteractive({ useHandCursor: true });

  bg.on("pointerover", () => {
    if (!enabled) return;
    idlePulse.pause();
    bg.setFillStyle(C.blood, 0.65);
    bg.setStrokeStyle(2, C.ember, 1);
    text.setColor(COLORS.ember);
    scene.tweens.add({
      targets: bg,
      scaleX: 1.06,
      scaleY: 1.08,
      duration: 120,
      ease: "Sine.Out",
    });
  });

  bg.on("pointerout", () => {
    if (!enabled) return;
    idlePulse.resume();
    bg.setFillStyle(C.blood, 0.45);
    bg.setStrokeStyle(2, C.ember, 0.75);
    text.setColor(COLORS.bone);
    scene.tweens.add({
      targets: bg,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: "Sine.In",
    });
  });

  bg.on("pointerdown", () => {
    if (!enabled) return;
    scene.tweens.add({
      targets: bg,
      scaleX: 0.96,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => onClick(),
    });
  });

  return {
    container,
    destroy: () => {
      idlePulse.stop();
      container.destroy(true);
    },
  };
}

/** Secondary hub button — cancel / back actions. */
export function createHubSecondaryButton(
  scene: Phaser.Scene,
  label: string,
  onClick: () => void,
  width = 168,
): HubButtonHandle {
  const h = 44;
  const bg = scene.add.rectangle(0, 0, width, h, C.smoke, 0.92);
  bg.setStrokeStyle(1, C.fog, 0.9);

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "20px",
    color: COLORS.bone,
    letterSpacing: 1,
  }).setOrigin(0.5);

  const container = scene.add.container(0, 0, [bg, text]);
  bg.setInteractive({ useHandCursor: true });

  bg.on("pointerover", () => {
    bg.setStrokeStyle(2, C.blood, 0.85);
    bg.setFillStyle(C.ash, 0.95);
    text.setColor(COLORS.ember);
  });
  bg.on("pointerout", () => {
    bg.setStrokeStyle(1, C.fog, 0.9);
    bg.setFillStyle(C.smoke, 0.92);
    text.setColor(COLORS.bone);
    bg.setScale(1);
  });
  bg.on("pointerdown", () => {
    scene.tweens.add({
      targets: bg,
      scaleX: 0.96,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => onClick(),
    });
  });

  return {
    container,
    destroy: () => container.destroy(true),
  };
}

/** Top-corner text link — skip, settings, surrender. Uses layout chrome anchors. */
export function createHubCornerLink(
  scene: Phaser.Scene,
  label: string,
  onClick: () => void,
  options?: {
    depth?: number;
    corner?: "top-right" | "top-left";
    y?: number;
  },
): Phaser.GameObjects.Text {
  const { width } = scene.scale;
  const depth = options?.depth ?? 130;
  const corner = options?.corner ?? "top-right";
  const y =
    options?.y ??
    (corner === "top-left" ? L.chrome.skipY : L.chrome.surrenderY);
  const x = corner === "top-right" ? width - L.chrome.marginX : L.chrome.marginX;
  const originX = corner === "top-right" ? 1 : 0;

  return scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: "21px",
      color: COLORS.link,
      backgroundColor: "#14121ccc",
      padding: { x: 12, y: 6 },
    })
    .setOrigin(originX, 0)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true })
    .on("pointerover", (txt: Phaser.GameObjects.Text) => txt.setColor(COLORS.linkHover))
    .on("pointerout", (txt: Phaser.GameObjects.Text) => txt.setColor(COLORS.link))
    .on("pointerdown", onClick);
}

export interface HubActionButtonHandle {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
  setDimmed: (dimmed: boolean) => void;
  resetHover: () => void;
}

/** Duel action chip — blood hover, matches hub menu buttons. */
export function createHubActionButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  depth = 10,
  onHover?: (hovering: boolean) => void,
): HubActionButtonHandle {
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.92);
  bg.setStrokeStyle(1, C.fog, 0.9);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "20px",
    color: COLORS.bone,
    align: "center",
    wordWrap: { width: w - 12 },
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]).setDepth(depth);
  let enabled = false;
  let hovering = false;
  let dimmed = false;

  const applyStyle = (): void => {
    scene.tweens.killTweensOf(bg);
    if (!enabled) {
      bg.setStrokeStyle(1, C.fog);
      bg.setFillStyle(C.ash, 0.5);
      text.setColor(COLORS.dust);
      bg.setAlpha(dimmed ? 0.35 : 0.5);
      text.setAlpha(dimmed ? 0.35 : 0.5);
      bg.setScale(1);
      return;
    }
    bg.setAlpha(dimmed ? 0.35 : 1);
    text.setAlpha(dimmed ? 0.35 : 1);
    if (hovering) {
      bg.setStrokeStyle(2, C.blood, 1);
      bg.setFillStyle(C.blood, 0.28);
      text.setColor(COLORS.ember);
    } else {
      bg.setStrokeStyle(1, C.fog, 0.9);
      bg.setFillStyle(C.smoke, 0.92);
      text.setColor(COLORS.bone);
      bg.setScale(1);
    }
  };

  bg.setInteractive({ useHandCursor: true });
  bg.disableInteractive();

  bg.on("pointerover", () => {
    if (!enabled || dimmed) return;
    hovering = true;
    onHover?.(true);
    applyStyle();
    scene.tweens.add({ targets: bg, scaleX: 1.04, scaleY: 1.08, duration: 90, ease: "Sine.Out" });
  });
  bg.on("pointerout", () => {
    hovering = false;
    onHover?.(false);
    scene.tweens.add({
      targets: bg,
      scaleX: 1,
      scaleY: 1,
      duration: 110,
      ease: "Sine.In",
      onComplete: () => applyStyle(),
    });
  });
  bg.on("pointerdown", () => {
    if (!enabled || dimmed) return;
    onClick();
  });

  applyStyle();

  return {
    container,
    setEnabled(next: boolean) {
      enabled = next;
      if (!next) {
        hovering = false;
        bg.disableInteractive();
      } else if (!dimmed) {
        bg.setInteractive({ useHandCursor: true });
      }
      applyStyle();
    },
    setDimmed(next: boolean) {
      dimmed = next;
      if (dimmed) hovering = false;
      if (!dimmed && enabled) {
        bg.setInteractive({ useHandCursor: true });
      }
      applyStyle();
    },
    resetHover() {
      hovering = false;
      bg.setScale(1);
      applyStyle();
    },
  };
}

/** Hub menu row — positioned secondary button (title / result screens). */
export function createHubMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
): HubButtonHandle {
  const btn = createHubSecondaryButton(scene, label, onClick, width);
  btn.container.setPosition(x, y);
  return btn;
}

/** Hub menu row — positioned primary / accent button. */
export function createHubAccentMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
): HubButtonHandle {
  const btn = createHubPrimaryButton(scene, label, onClick, width);
  btn.container.setPosition(x, y);
  return btn;
}

/** Toggle / choice chip — language picker, options. */
export function createHubChoiceButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  active: boolean,
  onClick: () => void,
  width = 150,
): HubButtonHandle {
  const h = 36;
  const bg = scene.add.rectangle(0, 0, width, h, C.smoke, 0.92);
  bg.setStrokeStyle(active ? 2 : 1, active ? C.blood : C.fog, active ? 0.95 : 0.9);

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT,
    fontSize: "22px",
    color: active ? COLORS.ember : COLORS.bone,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true });

  bg.on("pointerover", () => {
    bg.setStrokeStyle(2, C.blood, 0.85);
    text.setColor(COLORS.ember);
  });
  bg.on("pointerout", () => {
    bg.setStrokeStyle(active ? 2 : 1, active ? C.blood : C.fog, active ? 0.95 : 0.9);
    text.setColor(active ? COLORS.ember : COLORS.bone);
  });
  bg.on("pointerdown", onClick);

  return {
    container,
    destroy: () => container.destroy(true),
  };
}

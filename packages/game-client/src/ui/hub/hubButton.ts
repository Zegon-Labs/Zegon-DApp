import Phaser from "phaser";
import { C, COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { DUEL_LAYOUT as L } from "../layout.js";
import { playActionHover, playUiClick, playUiHover } from "../../services/sfx.js";

export interface HubButtonHandle {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
}

/** One press → one action; visual squash without stacking tween callbacks. */
function bindHubButtonPress(
  scene: Phaser.Scene,
  bg: Phaser.GameObjects.Rectangle,
  onClick: () => void,
  canPress: () => boolean = () => true,
  cooldownMs = 350,
): void {
  let locked = false;
  bg.on("pointerup", () => {
    if (locked || !canPress()) return;
    locked = true;
    scene.tweens.killTweensOf(bg);
    playUiClick();
    onClick();
    scene.tweens.add({
      targets: bg,
      scaleX: 0.96,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => bg.setScale(1),
    });
    scene.time.delayedCall(cooldownMs, () => {
      locked = false;
    });
  });
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
    playUiHover();
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

  bindHubButtonPress(scene, bg, onClick, () => enabled);

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
    playUiHover();
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
  bindHubButtonPress(scene, bg, onClick);

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
    (corner === "top-left" ? L.chrome.skipY : L.chrome.panelY);
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
    .on("pointerover", (txt: Phaser.GameObjects.Text) => {
      playUiHover();
      txt.setColor(COLORS.linkHover);
    })
    .on("pointerout", (txt: Phaser.GameObjects.Text) => txt.setColor(COLORS.link))
    .on("pointerdown", () => {
      playUiClick();
      onClick();
    });
}

export interface HubActionButtonHandle {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
  setDimmed: (dimmed: boolean) => void;
  resetHover: () => void;
}

import { drawActionIcon } from "./duelHudDraw.js";

/** Duel action chip — hub-style secondary button with icon + label. */
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
  actionId?: string,
): HubActionButtonHandle {
  const bg = scene.add.rectangle(0, 0, w, h, C.smoke, 0.94);
  bg.setStrokeStyle(1, C.fog, 0.9);
  const iconGfx = scene.add.graphics();
  const iconX = -w / 2 + 16;
  if (actionId) {
    drawActionIcon(iconGfx, iconX, 0, actionId, C.bone, 12);
  }
  const text = scene.add.text(actionId ? -w / 2 + 32 : 0, 0, label, {
    fontFamily: FONT,
    fontSize: "13px",
    color: COLORS.bone,
    align: "left",
  }).setOrigin(actionId ? 0 : 0.5, 0.5);

  const container = scene.add.container(x, y, [bg, iconGfx, text]).setDepth(depth);
  const hitArea = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
  let enabled = false;
  let hovering = false;
  let dimmed = false;

  const applyStyle = (): void => {
    if (!enabled) {
      bg.setStrokeStyle(1, C.fog, 0.5);
      bg.setFillStyle(C.ash, 0.45);
      text.setColor(COLORS.dust);
      bg.setAlpha(dimmed ? 0.35 : 0.55);
      text.setAlpha(dimmed ? 0.35 : 0.55);
      if (actionId) {
        iconGfx.clear();
        drawActionIcon(iconGfx, iconX, 0, actionId, C.fog, 12);
      }
      return;
    }
    bg.setAlpha(dimmed ? 0.35 : 1);
    text.setAlpha(dimmed ? 0.35 : 1);
    if (hovering) {
      bg.setStrokeStyle(2, C.blood, 1);
      bg.setFillStyle(C.blood, 0.28);
      text.setColor(COLORS.ember);
      if (actionId) {
        iconGfx.clear();
        drawActionIcon(iconGfx, iconX, 0, actionId, C.ember, 12);
      }
    } else {
      bg.setStrokeStyle(1, C.fog, 0.9);
      bg.setFillStyle(C.smoke, 0.94);
      text.setColor(COLORS.bone);
      if (actionId) {
        iconGfx.clear();
        drawActionIcon(iconGfx, iconX, 0, actionId, C.bone, 12);
      }
    }
  };

  const clearHover = (): void => {
    if (!hovering) return;
    hovering = false;
    onHover?.(false);
    applyStyle();
  };

  container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  if (container.input) container.input.cursor = "pointer";
  container.disableInteractive();

  container.on("pointerover", () => {
    if (!enabled || dimmed || hovering) return;
    hovering = true;
    playActionHover();
    onHover?.(true);
    applyStyle();
  });
  container.on("pointerout", () => {
    if (!enabled || dimmed) return;
    clearHover();
  });
  container.on("pointerdown", () => {
    if (!enabled || dimmed) return;
    onClick();
  });

  applyStyle();

  return {
    container,
    setEnabled(next: boolean) {
      if (enabled === next) return;
      enabled = next;
      if (!next) {
        clearHover();
        container.disableInteractive();
      } else if (!dimmed) {
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      }
      applyStyle();
    },
    setDimmed(next: boolean) {
      if (dimmed === next) return;
      dimmed = next;
      if (dimmed) clearHover();
      if (!dimmed && enabled) {
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      } else if (dimmed) {
        container.disableInteractive();
      }
      applyStyle();
    },
    resetHover() {
      clearHover();
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
    playUiHover();
    bg.setStrokeStyle(2, C.blood, 0.85);
    text.setColor(COLORS.ember);
  });
  bg.on("pointerout", () => {
    bg.setStrokeStyle(active ? 2 : 1, active ? C.blood : C.fog, active ? 0.95 : 0.9);
    text.setColor(active ? COLORS.ember : COLORS.bone);
  });
  bg.on("pointerdown", () => {
    playUiClick();
    onClick();
  });

  return {
    container,
    destroy: () => container.destroy(true),
  };
}

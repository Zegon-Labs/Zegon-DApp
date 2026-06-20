import Phaser from "phaser";
import { DUEL_LAYOUT as L, chromeButtonCenterX } from "../layout.js";
import {
  createHubSecondaryButton,
  type HubButtonHandle,
} from "./hubButton.js";

export interface HubGameChromeOptions {
  skip?: { label: string; onClick: () => void };
  settings?: {
    label: string;
    onClick: () => void;
    corner?: "top-left" | "top-right";
    y?: number;
  };
  surrender?: {
    label: string;
    onClick: () => void;
    corner?: "top-left" | "top-right";
    y?: number;
  };
  depth?: number;
  /** Stack hub-style buttons under the blindsight panel (duel scene). */
  duelStack?: boolean;
}

/** Corner controls shared by tutorial and duel scenes. */
export function createHubGameChrome(
  scene: Phaser.Scene,
  options: HubGameChromeOptions,
): HubButtonHandle[] {
  const depth = options.depth ?? 130;
  const handles: HubButtonHandle[] = [];

  if (options.skip) {
    const btn = createHubSecondaryButton(
      scene,
      options.skip.label,
      options.skip.onClick,
      160,
    );
    btn.container
      .setPosition(L.chrome.marginX + 80, L.chrome.skipY + L.chrome.buttonH / 2)
      .setDepth(depth);
    handles.push(btn);
  }

  if (options.duelStack && (options.settings || options.surrender)) {
    const cx = chromeButtonCenterX(scene.scale.width);
    let y = L.chrome.panelY + L.chrome.buttonH / 2;

    if (options.settings) {
      const btn = createHubSecondaryButton(
        scene,
        options.settings.label,
        options.settings.onClick,
        L.chrome.buttonW,
      );
      btn.container.setPosition(cx, y).setDepth(depth);
      handles.push(btn);
      y += L.chrome.buttonH + L.chrome.buttonGap;
    }

    if (options.surrender) {
      const btn = createHubSecondaryButton(
        scene,
        options.surrender.label,
        options.surrender.onClick,
        L.chrome.buttonW,
      );
      btn.container.setPosition(cx, y).setDepth(depth);
      handles.push(btn);
    }

    return handles;
  }

  if (options.settings) {
    const settingsCorner = options.settings.corner ?? "top-left";
    const { width } = scene.scale;
    const cx =
      settingsCorner === "top-right"
        ? width - L.chrome.marginX - 80
        : L.chrome.marginX + 80;
    const btn = createHubSecondaryButton(
      scene,
      options.settings.label,
      options.settings.onClick,
      160,
    );
    btn.container
      .setPosition(cx, (options.settings.y ?? L.chrome.skipY) + L.chrome.buttonH / 2)
      .setDepth(depth);
    handles.push(btn);
  }

  if (options.surrender) {
    const corner = options.surrender.corner ?? "top-right";
    const { width } = scene.scale;
    const cx =
      corner === "top-right"
        ? width - L.chrome.marginX - 80
        : L.chrome.marginX + 80;
    const btn = createHubSecondaryButton(
      scene,
      options.surrender.label,
      options.surrender.onClick,
      160,
    );
    btn.container
      .setPosition(cx, (options.surrender.y ?? L.chrome.panelY) + L.chrome.buttonH / 2)
      .setDepth(depth);
    handles.push(btn);
  }

  return handles;
}

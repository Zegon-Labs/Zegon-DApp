import Phaser from "phaser";
import { DUEL_LAYOUT as L } from "../layout.js";
import { createHubCornerLink } from "./hubButton.js";

export interface HubGameChromeOptions {
  skip?: { label: string; onClick: () => void };
  settings?: { label: string; onClick: () => void; corner?: "top-left" | "top-right" };
  surrender?: { label: string; onClick: () => void };
  depth?: number;
}

/** Corner controls shared by tutorial and duel scenes. */
export function createHubGameChrome(
  scene: Phaser.Scene,
  options: HubGameChromeOptions,
): void {
  const depth = options.depth ?? 130;

  if (options.skip) {
    createHubCornerLink(scene, options.skip.label, options.skip.onClick, {
      depth,
      corner: "top-left",
      y: L.chrome.skipY,
    });
  }

  if (options.settings) {
    const settingsCorner = options.settings.corner ?? "top-left";
    createHubCornerLink(scene, options.settings.label, options.settings.onClick, {
      depth,
      corner: settingsCorner === "top-right" ? "top-right" : "top-left",
      y: settingsCorner === "top-right" ? L.chrome.settingsRightY : L.chrome.settingsY,
    });
  }

  if (options.surrender) {
    createHubCornerLink(scene, options.surrender.label, options.surrender.onClick, {
      depth,
      corner: "top-right",
      y: L.chrome.surrenderY,
    });
  }
}

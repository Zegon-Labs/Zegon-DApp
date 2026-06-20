export type AppView =
  | { type: "hub" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "game" };

type NavigateListener = (view: AppView) => void;
type SceneListener = (scene: string, data?: Record<string, unknown>) => void;
type SettingsOverlayListener = (open: boolean) => void;

let navigateListener: NavigateListener | null = null;
let sceneListener: SceneListener | null = null;
let settingsOverlayListener: SettingsOverlayListener | null = null;

export const gameBridge = {
  navigate(view: AppView) {
    void import("../services/sfx.js").then(({ playSfx }) => playSfx("ui_navigate"));
    if (view.type === "hub") {
      void import("./phaser.js").then((m) => m.stopToBlank());
    }
    navigateListener?.(view);
  },

  startScene(scene: string, data?: Record<string, unknown>) {
    sceneListener?.(scene, data);
    navigateListener?.({ type: "game" });
  },

  openSettingsOverlay() {
    settingsOverlayListener?.(true);
  },

  closeSettingsOverlay() {
    settingsOverlayListener?.(false);
  },

  onNavigate(listener: NavigateListener) {
    navigateListener = listener;
    return () => {
      if (navigateListener === listener) navigateListener = null;
    };
  },

  onStartScene(listener: SceneListener) {
    sceneListener = listener;
    return () => {
      if (sceneListener === listener) sceneListener = null;
    };
  },

  onSettingsOverlay(listener: SettingsOverlayListener) {
    settingsOverlayListener = listener;
    return () => {
      if (settingsOverlayListener === listener) settingsOverlayListener = null;
    };
  },
};

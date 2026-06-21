export type AppView =
  | { type: "hub" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "achievements" }
  | { type: "game" };

type NavigateListener = (view: AppView) => void;
type SceneListener = (scene: string, data?: Record<string, unknown>) => void;
type SettingsOverlayListener = (open: boolean) => void;
type WalletRequestListener = () => void;
type ProfileSetupRequest = {
  address: string;
  required?: boolean;
  onReady?: () => void;
};
type ProfileSetupListener = (req: ProfileSetupRequest) => void;

let navigateListener: NavigateListener | null = null;
let sceneListener: SceneListener | null = null;
let settingsOverlayListener: SettingsOverlayListener | null = null;
let walletRequestListener: WalletRequestListener | null = null;
let profileSetupListener: ProfileSetupListener | null = null;

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

  requestWalletConnect() {
    walletRequestListener?.();
  },

  requestProfileSetup(req: ProfileSetupRequest) {
    profileSetupListener?.(req);
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

  onWalletConnectRequest(listener: WalletRequestListener) {
    walletRequestListener = listener;
    return () => {
      if (walletRequestListener === listener) walletRequestListener = null;
    };
  },

  onProfileSetupRequest(listener: ProfileSetupListener) {
    profileSetupListener = listener;
    return () => {
      if (profileSetupListener === listener) profileSetupListener = null;
    };
  },
};

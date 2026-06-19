export type AppView =
  | { type: "hub" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "game" }
  | {
      type: "result";
      result: import("@zegon/game-core").DuelResult;
      duelId?: string | null;
      apiBaseUrl?: string;
      mode?: "standard" | "daily";
    };

export interface DialogRequest {
  title?: string;
  body: string;
  badge?: string;
  buttonLabel: string;
  onDismiss: () => void;
}

type NavigateListener = (view: AppView) => void;
type DialogListener = (dialog: DialogRequest | null) => void;
type SceneListener = (scene: string, data?: Record<string, unknown>) => void;

let navigateListener: NavigateListener | null = null;
let dialogListener: DialogListener | null = null;
let sceneListener: SceneListener | null = null;

export const gameBridge = {
  navigate(view: AppView) {
    navigateListener?.(view);
  },

  startScene(scene: string, data?: Record<string, unknown>) {
    sceneListener?.(scene, data);
    navigateListener?.({ type: "game" });
  },

  openDialog(dialog: DialogRequest) {
    dialogListener?.(dialog);
  },

  closeDialog() {
    dialogListener?.(null);
  },

  onNavigate(listener: NavigateListener) {
    navigateListener = listener;
    return () => {
      if (navigateListener === listener) navigateListener = null;
    };
  },

  onDialog(listener: DialogListener) {
    dialogListener = listener;
    return () => {
      if (dialogListener === listener) dialogListener = null;
    };
  },

  onStartScene(listener: SceneListener) {
    sceneListener = listener;
    return () => {
      if (sceneListener === listener) sceneListener = null;
    };
  },
};

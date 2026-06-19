export type AppView =
  | { type: "hub" }
  | { type: "settings" }
  | { type: "leaderboard" }
  | { type: "game" };

type NavigateListener = (view: AppView) => void;
type SceneListener = (scene: string, data?: Record<string, unknown>) => void;

let navigateListener: NavigateListener | null = null;
let sceneListener: SceneListener | null = null;

export const gameBridge = {
  navigate(view: AppView) {
    navigateListener?.(view);
  },

  startScene(scene: string, data?: Record<string, unknown>) {
    sceneListener?.(scene, data);
    navigateListener?.({ type: "game" });
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
};

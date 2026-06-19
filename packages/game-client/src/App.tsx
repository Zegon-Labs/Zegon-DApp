import { useEffect, useState } from "react";
import { PhaserHost } from "@/components/PhaserHost";
import { TutorialDialog } from "@/components/TutorialDialog";
import { gameBridge, type AppView, type DialogRequest } from "@/game/bridge";
import { HubPage } from "@/pages/HubPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { ResultPage } from "@/pages/ResultPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { cn } from "@/lib/utils";

export default function App() {
  const [view, setView] = useState<AppView>({ type: "hub" });
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => gameBridge.onNavigate(setView), []);
  useEffect(() => gameBridge.onDialog(setDialog), []);

  const inGame = view.type === "game";

  return (
    <div className="min-h-screen bg-background">
      {view.type === "hub" && <HubPage />}
      {view.type === "settings" && (
        <SettingsPage onBack={() => gameBridge.navigate({ type: "hub" })} />
      )}
      {view.type === "leaderboard" && (
        <LeaderboardPage onBack={() => gameBridge.navigate({ type: "hub" })} />
      )}
      {view.type === "result" && (
        <ResultPage
          result={view.result}
          duelId={view.duelId}
          apiBaseUrl={view.apiBaseUrl}
          mode={view.mode}
          onMenu={() => gameBridge.navigate({ type: "hub" })}
        />
      )}

      <div
        className={cn(
          "fixed inset-0 z-10 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm",
          !inGame && "pointer-events-none invisible",
        )}
      >
        <PhaserHost visible={inGame} />
      </div>

      <TutorialDialog dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Toaster } from "sileo";
import { HeroHub } from "./components/HeroHub.js";
import { LeaderboardPanel } from "./components/LeaderboardPanel.js";
import { PhaserHost } from "./components/PhaserHost.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { gameBridge, type AppView } from "./game/bridge.js";

export default function App() {
  const [view, setView] = useState<AppView>({ type: "hub" });

  useEffect(() => gameBridge.onNavigate(setView), []);

  const inGame = view.type === "game";

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      {!inGame && view.type === "hub" && <HeroHub />}
      {!inGame && view.type === "settings" && (
        <>
          <HeroHub />
          <SettingsPanel />
        </>
      )}
      {!inGame && view.type === "leaderboard" && (
        <>
          <HeroHub />
          <LeaderboardPanel />
        </>
      )}
      <PhaserHost visible={inGame} />
    </>
  );
}

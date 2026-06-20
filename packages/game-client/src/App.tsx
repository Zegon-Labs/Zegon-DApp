import { useEffect, useState } from "react";
import { Toaster } from "sileo";
import { HeroHub } from "./components/HeroHub.js";
import { LeaderboardPanel } from "./components/LeaderboardPanel.js";
import { PhaserHost } from "./components/PhaserHost.js";
import { ProfileSetupModal } from "./components/ProfileSetupModal.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { gameBridge, type AppView } from "./game/bridge.js";
import { fetchProfile, hasNickname } from "./services/profile.js";
import { getWalletAddress, onWalletChange } from "./services/wallet.js";
import { playSfx, playUiClick, playUiHover } from "./services/sfx.js";

export default function App() {
  const [view, setView] = useState<AppView>({ type: "hub" });
  const [profileSetupAddress, setProfileSetupAddress] = useState<string | null>(null);
  const [inGameSettings, setInGameSettings] = useState(false);

  useEffect(() => gameBridge.onNavigate(setView), []);
  useEffect(() => gameBridge.onSettingsOverlay(setInGameSettings), []);

  useEffect(() => {
    async function checkProfile(address: string | null) {
      if (!address) {
        setProfileSetupAddress(null);
        return;
      }
      if (hasNickname(address)) {
        setProfileSetupAddress(null);
        return;
      }
      const remote = await fetchProfile(address);
      if (!remote?.nickname) {
        setProfileSetupAddress(address);
      } else {
        setProfileSetupAddress(null);
      }
    }

    void checkProfile(getWalletAddress());
    return onWalletChange((addr) => void checkProfile(addr));
  }, []);

  const inGame = view.type === "game";

  useEffect(() => {
    if (!inGame) setInGameSettings(false);
  }, [inGame]);

  useEffect(() => {
    if (profileSetupAddress) playSfx("ui_modal_open");
  }, [profileSetupAddress]);

  useEffect(() => {
    if (inGameSettings) playSfx("ui_modal_open");
  }, [inGameSettings]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-skip-ui-click]")) return;
      if (target.closest(".btn, .archetype-card, .hero__verify-link")) {
        playUiClick();
      }
    };
    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".btn, .archetype-card")) {
        playUiHover();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("mouseover", onOver);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      {!inGame && view.type === "hub" && (
        <HeroHub onNeedsProfile={(addr) => setProfileSetupAddress(addr)} />
      )}
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
      {inGame && inGameSettings && (
        <SettingsPanel overlay onClose={() => gameBridge.closeSettingsOverlay()} />
      )}
      {profileSetupAddress && !inGame && (
        <ProfileSetupModal
          address={profileSetupAddress}
          onComplete={() => setProfileSetupAddress(null)}
          onSkip={() => setProfileSetupAddress(null)}
        />
      )}
    </>
  );
}

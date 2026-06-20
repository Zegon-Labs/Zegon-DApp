import { useEffect, useState } from "react";
import { Toaster } from "sileo";
import { HackathonStatusBar } from "./components/HackathonStatusBar.js";
import { HeroHub } from "./components/HeroHub.js";
import { LeaderboardPanel } from "./components/LeaderboardPanel.js";
import { PhaserHost } from "./components/PhaserHost.js";
import { ProfileSetupModal } from "./components/ProfileSetupModal.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { gameBridge, type AppView } from "./game/bridge.js";
import { fetchProfile, hasNickname } from "./services/profile.js";
import { getWalletAddress, onWalletChange } from "./services/wallet.js";

export default function App() {
  const [view, setView] = useState<AppView>({ type: "hub" });
  const [profileSetupAddress, setProfileSetupAddress] = useState<string | null>(null);

  useEffect(() => gameBridge.onNavigate(setView), []);

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
      {inGame && (
        <div className="hackathon-bar-wrap">
          <HackathonStatusBar
            commitTxHash={
              typeof sessionStorage !== "undefined"
                ? sessionStorage.getItem("zegon-last-commit")
                : null
            }
          />
        </div>
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

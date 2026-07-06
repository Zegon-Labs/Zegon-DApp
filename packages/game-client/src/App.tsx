import { useEffect, useState } from "react";
import { Toaster } from "sileo";
import { HeroHub } from "./components/HeroHub.js";
import { AchievementsPanel } from "./components/AchievementsPanel.js";
import { LeaderboardPanel } from "./components/LeaderboardPanel.js";
import { PhaserHost } from "./components/PhaserHost.js";
import { ProfileSetupModal } from "./components/ProfileSetupModal.js";
import { ProfilePanel } from "./components/ProfilePanel.js";
import { UpgradeSaloon } from "./components/UpgradeSaloon.js";
import { useReplayOverlay } from "./components/ReplayPanel.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { gameBridge, type AppView } from "./game/bridge.js";
import { fetchProfile, hasNickname } from "./services/profile.js";
import { connectWallet, getWalletAddress, onWalletChange } from "./services/wallet.js";
import { playSfx, playUiClick, playUiHover } from "./services/sfx.js";
import { trackMetric } from "./services/metrics.js";

export default function App() {
  const [view, setView] = useState<AppView>({ type: "hub" });
  const [profileSetupAddress, setProfileSetupAddress] = useState<string | null>(null);
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);
  const [profileSetupReady, setProfileSetupReady] = useState<(() => void) | null>(null);
  const [inGameSettings, setInGameSettings] = useState(false);
  const { overlay: replayOverlay } = useReplayOverlay();

  useEffect(() => gameBridge.onNavigate(setView), []);
  useEffect(() => gameBridge.onSettingsOverlay(setInGameSettings), []);
  useEffect(() => {
    trackMetric("page_view");
  }, []);
  useEffect(
    () =>
      gameBridge.onWalletConnectRequest(() => {
        void connectWallet({ pickAccount: false }).catch(() => undefined);
      }),
    [],
  );
  useEffect(
    () =>
      gameBridge.onProfileSetupRequest((req) => {
        setProfileSetupAddress(req.address);
        setProfileSetupRequired(Boolean(req.required));
        setProfileSetupReady(() => req.onReady ?? null);
      }),
    [],
  );

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
    const hoverSelector = ".btn, .archetype-card, .hero__footer-built, .footer-feature";
    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const hoverEl = target.closest(hoverSelector);
      if (!hoverEl) return;
      const related = event.relatedTarget;
      if (related instanceof Node && hoverEl.contains(related)) return;
      playUiHover();
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
      {!inGame && view.type === "achievements" && (
        <>
          <HeroHub />
          <AchievementsPanel />
        </>
      )}
      {!inGame && view.type === "profile" && (
        <>
          <HeroHub />
          <ProfilePanel />
        </>
      )}
      {!inGame && view.type === "saloon" && (
        <>
          <HeroHub />
          <UpgradeSaloon />
        </>
      )}
      <PhaserHost visible={inGame} />
      {replayOverlay}
      {inGame && inGameSettings && (
        <SettingsPanel overlay onClose={() => gameBridge.closeSettingsOverlay()} />
      )}
      {profileSetupAddress && (
        <ProfileSetupModal
          address={profileSetupAddress}
          onComplete={() => {
            profileSetupReady?.();
            setProfileSetupAddress(null);
            setProfileSetupRequired(false);
            setProfileSetupReady(null);
          }}
          onSkip={
            profileSetupRequired
              ? undefined
              : () => {
                  setProfileSetupAddress(null);
                  setProfileSetupRequired(false);
                  setProfileSetupReady(null);
                }
          }
        />
      )}
    </>
  );
}

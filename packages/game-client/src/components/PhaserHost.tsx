import { useEffect, useRef } from "react";
import { gameBridge } from "../game/bridge.js";
import {
  createPhaserGame,
  destroyPhaserGame,
  startPhaserScene,
  stopToBlank,
} from "../game/phaser.js";

interface PhaserHostProps {
  visible: boolean;
}

export function PhaserHost({ visible }: PhaserHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    createPhaserGame(containerRef.current);
    const unsub = gameBridge.onStartScene((scene, data) => {
      startPhaserScene(scene, data);
    });
    return () => {
      unsub();
      destroyPhaserGame();
    };
  }, []);

  useEffect(() => {
    if (!visible) stopToBlank();
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="game-stage">
      <div className="game-stage__frame">
        <div ref={containerRef} className="aspect-[854/480] w-full" />
      </div>
    </div>
  );
}

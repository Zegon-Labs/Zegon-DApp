import { useEffect, useRef } from "react";
import { gameBridge } from "../game/bridge.js";
import {
  createPhaserGame,
  destroyPhaserGame,
  refreshPhaserScale,
  startPhaserScene,
  stopToBlank,
} from "../game/phaser.js";

interface PhaserHostProps {
  visible: boolean;
}

export function PhaserHost({ visible }: PhaserHostProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Phaser must stay mounted (hidden) so the canvas exists before startScene fires.
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
    else {
      requestAnimationFrame(() => {
        refreshPhaserScale();
        requestAnimationFrame(refreshPhaserScale);
      });
    }
  }, [visible]);

  useEffect(() => {
    const stage = stageRef.current;
    const onResize = () => refreshPhaserScale();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const observer = stage ? new ResizeObserver(onResize) : null;
    if (stage) observer?.observe(stage);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="game-stage"
      style={
        visible
          ? undefined
          : { visibility: "hidden", pointerEvents: "none", position: "fixed", inset: 0, zIndex: -1 }
      }
      aria-hidden={!visible}
    >
      <div className="game-stage__frame">
        <div ref={containerRef} className="game-stage__canvas" />
      </div>
    </div>
  );
}

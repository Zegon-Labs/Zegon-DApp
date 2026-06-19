import { useEffect, useRef } from "react";
import { gameBridge } from "@/game/bridge";
import {
  createPhaserGame,
  destroyPhaserGame,
  startPhaserScene,
  stopToBlank,
} from "@/game/phaser";
import { cn } from "@/lib/utils";

interface PhaserHostProps {
  visible: boolean;
  className?: string;
}

export function PhaserHost({ visible, className }: PhaserHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    createPhaserGame(containerRef.current);

    const unsubScene = gameBridge.onStartScene((scene, data) => {
      startPhaserScene(scene, data);
    });

    return () => {
      unsubScene();
      destroyPhaserGame();
    };
  }, []);

  useEffect(() => {
    if (!visible) stopToBlank();
  }, [visible]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[854px] overflow-hidden rounded-xl border border-accent/30 bg-card shadow-[0_0_40px_-12px_rgba(255,77,46,0.35)]",
        !visible && "pointer-events-none invisible fixed -left-[9999px] top-0",
        className,
      )}
    >
      <div ref={containerRef} className="aspect-[854/480] w-full [&_canvas]:!h-full [&_canvas]:!w-full" />
    </div>
  );
}

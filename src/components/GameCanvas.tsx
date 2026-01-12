import { useEffect, useRef } from "react";
import Phaser from "phaser";

import BootScene from "../game/BootScene";
import MenuScene from "../game/MenuScene";
import PlayScene from "../game/PlayScene";
import Nivel2Scene from "../game/Nivel2Scene";
import HubScene from "../game/HubScene";

const BASE_WIDTH = 320;
const BASE_HEIGHT = 160;

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: "#0f172a",
      render: {
        pixelArt: true,
        antialias: false,
      },
      scale: {
        mode: Phaser.Scale.ENVELOP, // Fullscreen sin barras
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
      },
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
          gravity: { x: 0, y: 0 },
        },
      },
      scene: [BootScene, MenuScene, PlayScene, HubScene, Nivel2Scene],
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
}

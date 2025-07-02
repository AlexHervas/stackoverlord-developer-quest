import { useEffect, useRef } from "react";
import Phaser from "phaser";
import BootScene from "../game/BootScene";
import MenuScene from "../game/MenuScene";
import PlayScene from "../game/PlayScene";

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: ref.current,
      backgroundColor: "#1a1a1a",
      scene: [BootScene, MenuScene, PlayScene],
      physics: { default: "arcade" },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={ref} className="w-full h-full" />;
}

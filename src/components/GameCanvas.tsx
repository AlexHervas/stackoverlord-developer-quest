import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import BootScene from "../game/BootScene";
import MenuScene from "../game/MenuScene";
import PlayScene from "../game/PlayScene";

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: ref.current,
      backgroundColor: "#1a1a1a",
      scene: [
        new BootScene(),
        new MenuScene(),
        new PlayScene((projectId: string) => setActiveProject(projectId)),
      ],
      physics: { default: "arcade", arcade: { debug: true } },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <>
      <div ref={ref} className="w-full h-full" />

      {activeProject && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
          <div className="bg-white text-black p-6 rounded-lg w-[300px] text-center shadow-lg">
            <h2 className="text-xl font-bold mb-4">{activeProject}</h2>
            <p className="mb-4">
              Este es uno de mis proyectos destacados. Haz clic en el botón para
              saber más.
            </p>
            <button
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
              onClick={() => setActiveProject(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

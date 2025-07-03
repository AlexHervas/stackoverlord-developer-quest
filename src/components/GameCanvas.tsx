import { useEffect, useRef, useState } from "react";
import type { ProjectData } from "../types/types";
import Phaser from "phaser";
import BootScene from "../game/BootScene";
import MenuScene from "../game/MenuScene";
import PlayScene from "../game/PlayScene";

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);

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
        new PlayScene((project: ProjectData) => setActiveProject(project)),
      ],
      physics: { default: "arcade", arcade: { debug: true } },
      render: {
        pixelArt: true,
      },
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
          <div className="bg-white text-black p-6 rounded-lg w-[350px] text-center shadow-lg">
            <h2 className="text-2xl font-bold mb-2">{activeProject.title}</h2>
            <p className="mb-4 text-sm">{activeProject.description}</p>

            {activeProject.link && (
              <a
                href={activeProject.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline block mb-4"
              >
                Ver en GitHub
              </a>
            )}

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

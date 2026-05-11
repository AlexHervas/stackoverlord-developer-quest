import Phaser from "phaser";
import type {
  CombatHudConfig,
  CombatHudTexts,
  CombatOverlayTexts,
  CombatStaticTexts,
} from "./types";

export function createStaticTexts(
  scene: Phaser.Scene,
  config: CombatHudConfig,
): CombatStaticTexts {
  scene.add
    .text(4, 2, "ARENA", {
      fontFamily: "monospace",
      fontSize: config.titleFont,
      color: "#ffe7a2",
    })
    .setScrollFactor(0);

  const attackHintText = scene.add
    .text(
      config.arenaWidth / 2,
      18,
      "SPACE/A: ATTACK | ESC/BACK: HUB",
      {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 4, y: 2 },
      },
    )
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(10);

  return { attackHintText };
}

export function createHudTexts(
  scene: Phaser.Scene,
  config: CombatHudConfig,
): CombatHudTexts {
  const roundText = scene.add
    .text(8, config.arenaHeight - 34, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.45)",
      padding: { x: 4, y: 2 },
    })
    .setScrollFactor(0);

  const healthText = scene.add
    .text(8, config.arenaHeight - 18, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffe7a2",
      backgroundColor: "rgba(0,0,0,0.45)",
      padding: { x: 4, y: 2 },
    })
    .setScrollFactor(0);

  const enemiesText = scene.add
    .text(config.arenaWidth - 8, config.arenaHeight - 18, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.45)",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0);

  const scoreText = scene.add
    .text(config.arenaWidth - 8, config.arenaHeight - 34, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffe7a2",
      backgroundColor: "rgba(0,0,0,0.45)",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0);

  return {
    roundText,
    healthText,
    enemiesText,
    scoreText,
  };
}

export function createOverlayTexts(
  scene: Phaser.Scene,
  config: CombatHudConfig,
): CombatOverlayTexts {
  const messageText = scene.add
    .text(config.arenaWidth / 2, 44, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: { x: 5, y: 3 },
    })
    .setOrigin(0.5)
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(20);

  const rankingText = scene.add
    .text(config.arenaWidth / 2, 60, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#fff4bf",
      backgroundColor: "rgba(0,0,0,0.82)",
      padding: { x: 6, y: 5 },
      align: "left",
    })
    .setOrigin(0.5, 0)
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(20);

  const statsText = scene.add
    .text(config.arenaWidth / 2, 32, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffe7a2",
      backgroundColor: "rgba(0,0,0,0.82)",
      padding: { x: 5, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(21);

  const nameInputText = scene.add
    .text(config.arenaWidth / 2, config.arenaHeight / 2 + 10, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffffff",
      backgroundColor: "rgba(79,45,22,0.85)",
      padding: { x: 5, y: 3 },
    })
    .setOrigin(0.5)
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(20);

  const controlsText = scene.add
    .text(config.arenaWidth / 2, config.arenaHeight - 2, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#05F521",
      backgroundColor: "rgba(0,0,0,0.72)",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(20);

  return {
    messageText,
    rankingText,
    statsText,
    nameInputText,
    controlsText,
  };
}

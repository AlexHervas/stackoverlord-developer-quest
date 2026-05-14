import Phaser from "phaser";
import type {
  CombatHudConfig,
  CombatHudTexts,
  CombatOverlayTexts,
  CombatStaticTexts,
} from "./types";
import { getAttackHubHint } from "../input/inputMode";

const HEART_FULL_FRAME = 0;
const HEART_HALF_FRAME = 1;
const HEART_EMPTY_FRAME = 2;
const HEART_SIZE = 16;
const HEART_COUNT = 3;
const HEART_Y = 0;

export function createStaticTexts(
  scene: Phaser.Scene,
  config: CombatHudConfig,
): CombatStaticTexts {
  const attackHintText = scene.add
    .text(
      config.arenaWidth / 2,
      config.arenaHeight - 2,
      getAttackHubHint(),
      {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 4, y: 2 },
      },
    )
    .setOrigin(0.5, 1)
    .setScrollFactor(0)
    .setDepth(10);

  return { attackHintText };
}

export function createHudTexts(
  scene: Phaser.Scene,
  config: CombatHudConfig,
): CombatHudTexts {
  const roundText = scene.add
    .text(8, config.arenaHeight - 18, "", {
      fontFamily: "monospace",
      fontSize: config.uiFont,
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.45)",
      padding: { x: 4, y: 2 },
    })
    .setScrollFactor(0);

  const healthHearts = Array.from({ length: HEART_COUNT }, (_, index) =>
    scene.add
      .image(4 + index * HEART_SIZE, HEART_Y, "hearts", HEART_FULL_FRAME)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10),
  );

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
    healthHearts,
    enemiesText,
    scoreText,
  };
}

export function updateHealthHearts(
  hearts: Phaser.GameObjects.Image[],
  health: number,
) {
  hearts.forEach((heart, index) => {
    const heartHealth = health - index * 2;
    if (heartHealth >= 2) {
      heart.setFrame(HEART_FULL_FRAME);
    } else if (heartHealth === 1) {
      heart.setFrame(HEART_HALF_FRAME);
    } else {
      heart.setFrame(HEART_EMPTY_FRAME);
    }
  });
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

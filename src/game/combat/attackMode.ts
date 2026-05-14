import Phaser from "phaser";

export type AttackMode = "auto" | "manual";

export type CombatSceneData = {
  attackMode?: AttackMode;
  forceAttackModeSelection?: boolean;
};

type AttackModeSelectionConfig = {
  arenaWidth: number;
  arenaHeight: number;
  titleFont: string;
};

type AttackModeSelectionCallbacks = {
  onAuto: () => void;
  onManual: () => void;
};

const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 128;
const BUTTON_WIDTH = 84;
const BUTTON_HEIGHT = 28;

export function createAttackModeSelection(
  scene: Phaser.Scene,
  config: AttackModeSelectionConfig,
  callbacks: AttackModeSelectionCallbacks,
) {
  const overlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(30);
  const backdrop = scene.add
    .rectangle(0, 0, config.arenaWidth, config.arenaHeight, 0x000000, 0.48)
    .setOrigin(0);
  const panelX = config.arenaWidth / 2 - PANEL_WIDTH / 2;
  const panelY = config.arenaHeight / 2 - PANEL_HEIGHT / 2;
  const panel = scene.add
    .rectangle(
      config.arenaWidth / 2,
      config.arenaHeight / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      0x241510,
      0.94,
    )
    .setStrokeStyle(1, 0xffe7a2, 0.85);
  const title = scene.add
    .text(config.arenaWidth / 2, panelY + 12, "CHOOSE ATTACK MODE", {
      fontFamily: "monospace",
      fontSize: config.titleFont,
      color: "#ffe7a2",
    })
    .setOrigin(0.5, 0);
  const description = scene.add
    .text(
      config.arenaWidth / 2,
      panelY + 32,
      "E/BACK: auto  SPACE/A: manual\nP: pause\nExit and enter again to change the mode.",
      {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffffff",
        align: "center",
      },
    )
    .setOrigin(0.5, 0);
  const autoButton = createAttackModeButton(
    scene,
    panelX + 20,
    panelY + 82,
    "AUTO",
    "AIM BY MOVING",
    callbacks.onAuto,
  );
  const manualButton = createAttackModeButton(
    scene,
    panelX + PANEL_WIDTH - BUTTON_WIDTH - 20,
    panelY + 82,
    "SPACE / A",
    "PRESS TO HIT",
    callbacks.onManual,
  );

  overlay.add([
    backdrop,
    panel,
    title,
    description,
    ...autoButton,
    ...manualButton,
  ]);

  return overlay;
}

function createAttackModeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  detail: string,
  onSelect: () => void,
) {
  const background = scene.add
    .rectangle(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, 0x3a2418, 1)
    .setOrigin(0)
    .setStrokeStyle(1, 0xffe7a2, 0.75)
    .setInteractive({ useHandCursor: true });
  const labelText = scene.add
    .text(x + BUTTON_WIDTH / 2, y + 5, label, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffe7a2",
    })
    .setOrigin(0.5, 0);
  const detailText = scene.add
    .text(x + BUTTON_WIDTH / 2, y + 18, detail, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#fff4bf",
    })
    .setOrigin(0.5, 0);

  background.on("pointerover", () => background.setFillStyle(0x4f2d16, 1));
  background.on("pointerout", () => background.setFillStyle(0x3a2418, 1));
  background.on("pointerdown", onSelect);

  return [background, labelText, detailText];
}

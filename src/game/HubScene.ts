import Phaser from "phaser";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;

export default class HubScene extends Phaser.Scene {
  constructor() {
    super("HubScene");
  }

  create() {
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    this.add
      .text(
        ROOM_WIDTH / 2,
        ROOM_HEIGHT / 2,
        "HUB (próximo paso: NPCs CV / About)",
        {
          fontSize: "12px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 18, "Pulsa ESC para volver", {
        fontSize: "10px",
        color: "#00ff00",
      })
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("PlayScene");
    });
  }
}

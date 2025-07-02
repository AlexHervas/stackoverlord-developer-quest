import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 50, "Bienvenido a mi portfolio", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const playText = this.add
      .text(width / 2, height / 2 + 20, "Haz clic para empezar", {
        fontSize: "18px",
        color: "#00ff00",
      })
      .setOrigin(0.5)
      .setInteractive();

    playText.on("pointerdown", () => {
      this.scene.start("PlayScene");
    });
  }
}

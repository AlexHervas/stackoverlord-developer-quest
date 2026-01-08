import Phaser from "phaser";

export default class Nivel2Scene extends Phaser.Scene {
  constructor() {
    super("Nivel2Scene");
  }

  create() {
    this.add
      .text(400, 300, "🌟 Nivel 2: Aquí empieza la zona principal", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Pulsar espacio para volver al Nivel 1
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.scene.start("PlayScene");
    });
  }
}

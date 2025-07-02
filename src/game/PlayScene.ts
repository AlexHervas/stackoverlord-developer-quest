import Phaser from "phaser";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(20, 20, "Nivel 1 - Muestra de proyectos", {
      fontSize: "20px",
      color: "#ffffff",
    });

    this.add.image(width / 2, height / 2, "logo").setScale(0.5);
  }
}

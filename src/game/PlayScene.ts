import Phaser from "phaser";
import type { ProjectData } from "../types/types";

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private onProjectTrigger: (projectId: ProjectData) => void;

  constructor(onProjectTrigger: (projectId: ProjectData) => void) {
    super("PlayScene");
    this.onProjectTrigger = onProjectTrigger;
  }

  preload() {
    this.load.spritesheet(
      "dude",
      "https://labs.phaser.io/assets/sprites/dude.png",
      {
        frameWidth: 32,
        frameHeight: 48,
      }
    );

    this.load.image(
      "logo",
      "https://labs.phaser.io/assets/sprites/phaser3-logo.png"
    );
  }

  create() {
    const { width, height } = this.scale;

    this.player = this.physics.add.sprite(width / 2, height / 2, "dude");

    this.player.setCollideWorldBounds(true);

    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "turn",
      frames: [{ key: "dude", frame: 4 }],
      frameRate: 20,
    });

    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });

    this.cursors = this.input?.keyboard?.createCursorKeys();

    // ZONA 1 – NoPiques
    const zoneNoPiques = this.physics.add
      .staticImage(600, 300, "logo")
      .setScale(0.2);
    zoneNoPiques.refreshBody();
    this.physics.add.overlap(
      this.player,
      zoneNoPiques,
      () => {
        this.onProjectTrigger({
          id: "nopiques",
          title: "NoPiques",
          description:
            "App que detecta posibles mensajes de phishing usando IA.",
          link: "https://github.com/AlexHervas/NoPiques",
        });
        zoneNoPiques.destroy();
      },
      undefined,
      this
    );

    // ZONA 2 – Wallaclone
    const zoneWallaclone = this.physics.add
      .staticImage(400, 400, "logo")
      .setScale(0.2);
    zoneWallaclone.refreshBody();
    this.physics.add.overlap(
      this.player,
      zoneWallaclone,
      () => {
        this.onProjectTrigger({
          id: "wallaclone",
          title: "Wallaclone",
          description:
            "Clon funcional de Wallapop con chat, login y panel de anuncios.",
          link: "https://github.com/KeepcodersWeb17/wallaclone",
        });
        zoneWallaclone.destroy();
      },
      undefined,
      this
    );

    // ZONA 3 – Portfolio
    const zonePortfolio = this.physics.add
      .staticImage(200, 300, "logo")
      .setScale(0.2);
    zonePortfolio.refreshBody();
    this.physics.add.overlap(
      this.player,
      zonePortfolio,
      () => {
        this.onProjectTrigger({
          id: "portfolio",
          title: "Este Portfolio",
          description:
            "Un portfolio interactivo gamificado hecho con React, Tailwind y Phaser.",
          link: "https://github.com/AlexHervas/PhaserPortfolio",
        });
        zonePortfolio.destroy();
      },
      undefined,
      this
    );
  }

  update() {
    if (!this.player || !this.cursors) return;

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play("left", true);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play("right", true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play("turn");
    }

    if (this.cursors.up?.isDown && this.player.body?.touching?.down) {
      this.player.setVelocityY(-330);
    }
  }
}

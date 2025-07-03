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
    this.load.image(
      "logo",
      "https://labs.phaser.io/assets/sprites/phaser3-logo.png"
    );
    this.load.image("floor", "assets/floor_1.png");
    this.load.image("wall", "assets/wall_1.png");
    this.load.image("chest", "assets/chest_closed.png");
    this.load.image("torch", "assets/torch_normal.png");
    this.load.image("wizard", "assets/wizard.png");
    this.load.image("playerSprite", "assets/player.png");
  }

  create() {
    const { width, height } = this.scale;

    for (let x = 0; x <= 800; x += 32) {
      for (let y = 0; y <= 600; y += 32) {
        this.add.image(x, y, "floor").setOrigin(0).setDisplaySize(32, 32);
      }
    }

    this.add.image(150, 150, "wall").setScale(2);
    this.add.image(700, 120, "torch").setScale(2);
    this.add.image(300, 200, "chest").setScale(2);
    this.add.image(500, 350, "wizard").setScale(2);

    this.player = this.physics.add
      .sprite(width / 2, height / 2, "playerSprite")
      .setScale(2.5);

    this.player.setCollideWorldBounds(true);

    if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
      this.player.body.setAllowGravity(false);
    }

    this.cursors = this.input?.keyboard?.createCursorKeys();

    const zones = [
      {
        x: 600,
        y: 300,
        data: {
          id: "nopiques",
          title: "NoPiques",
          description:
            "App que detecta posibles mensajes de phishing usando IA.",
          link: "https://github.com/AlexHervas/NoPiques",
        },
      },
      {
        x: 400,
        y: 400,
        data: {
          id: "wallaclone",
          title: "Wallaclone",
          description:
            "Clon funcional de Wallapop con chat, login y panel de anuncios.",
          link: "https://github.com/KeepcodersWeb17/wallaclone",
        },
      },
      {
        x: 200,
        y: 300,
        data: {
          id: "portfolio",
          title: "Este Portfolio",
          description:
            "Un portfolio interactivo gamificado hecho con React, Tailwind y Phaser.",
          link: "https://github.com/AlexHervas/PhaserPortfolio",
        },
      },
    ];

    zones.forEach(({ x, y, data }) => {
      const zone = this.physics.add.staticImage(x, y, "logo").setScale(0.2);
      zone.refreshBody();
      this.physics.add.overlap(
        this.player,
        zone,
        () => {
          this.onProjectTrigger(data);
          zone.destroy();
        },
        undefined,
        this
      );
    });
  }

  update() {
    if (!this.player || !this.cursors) return;

    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left?.isDown) {
      velocityX = -160;
      this.player.setFlipX(true);
      this.player.setAngle(-5);
    } else if (this.cursors.right?.isDown) {
      velocityX = 160;
      this.player.setFlipX(false);
      this.player.setAngle(5);
    } else {
      this.player.setAngle(0);
    }

    if (this.cursors.up?.isDown) {
      velocityY = -160;
    } else if (this.cursors.down?.isDown) {
      velocityY = 160;
    }

    this.player.setVelocity(velocityX, velocityY);
  }
}

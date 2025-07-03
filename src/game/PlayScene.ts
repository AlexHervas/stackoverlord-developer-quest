import Phaser from "phaser";
import type { ProjectData } from "../types/types";

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;

  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogVisible = false;

  private typingTimer?: Phaser.Time.TimerEvent;
  private fullDialogText = "";
  private currentCharIndex = 0;
  private continueHint!: Phaser.GameObjects.Text;

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

    // Suelo
    for (let x = 0; x <= 800; x += 32) {
      for (let y = 0; y <= 600; y += 32) {
        this.add.image(x, y, "floor").setOrigin(0).setDisplaySize(32, 32);
      }
    }

    // Decoración
    this.add.image(150, 150, "wall").setScale(2);
    this.add.image(700, 120, "torch").setScale(2);
    this.add.image(300, 200, "chest").setScale(2);

    // Mago
    const wizardZone = this.physics.add
      .staticImage(500, 350, "wizard")
      .setScale(2);
    wizardZone.refreshBody();

    // Personaje
    this.player = this.physics.add
      .sprite(width / 2, height / 2, "playerSprite")
      .setScale(2.5);

    this.player.setCollideWorldBounds(true);

    if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
      this.player.body.setAllowGravity(false);
    }

    // Teclado
    this.cursors = this.input?.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Caja de diálogo (oculta inicialmente)
    this.dialogBox = this.add
      .rectangle(400, 550, 700, 80, 0x000000, 0.7)
      .setOrigin(0.5)
      .setVisible(false);

    this.dialogText = this.add
      .text(400, 550, "", {
        fontSize: "18px",
        color: "#ffffff",
        wordWrap: { width: 660 },
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.continueHint = this.add
      .text(400, 580, "[ESPACIO] Continuar", {
        fontSize: "14px",
        color: "#ffff88",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0 },
      ease: "Cubic.easeInOut",
      duration: 800,
      repeat: -1,
      yoyo: true,
    });

    // Zonas interactivas
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

    // Mago dialogo al entrar en su zona
    this.physics.add.overlap(this.player, wizardZone, () => {
      if (!this.dialogVisible) {
        this.showDialog(
          "🧙‍♂️ Bienvenido, viajero...\nEste mundo está hecho de código y creatividad."
        );
      }
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

    // Ocultar diálogo al pulsar ESPACIO
    if (this.dialogVisible && Phaser.Input.Keyboard.JustDown(this.spaceKey!)) {
      this.hideDialog();
    }
  }

  // Función para mostrar diálogo con efecto máquina de escribir
  private showDialog(fullText: string) {
    this.dialogVisible = true;
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.continueHint.setVisible(false);
    this.dialogText.setText("");
    this.fullDialogText = fullText;
    this.currentCharIndex = 0;

    if (this.typingTimer) {
      this.typingTimer.remove(false);
    }

    this.typingTimer = this.time.addEvent({
      delay: 40,
      callback: () => {
        if (this.currentCharIndex < this.fullDialogText.length) {
          this.dialogText.text += this.fullDialogText[this.currentCharIndex];
          this.currentCharIndex++;
        } else {
          this.typingTimer?.remove(false);
          this.continueHint.setVisible(true);
        }
      },
      repeat: fullText.length - 1,
    });
  }

  // Ocultar diálogo y limpiar timer
  private hideDialog() {
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.dialogVisible = false;
    this.continueHint.setVisible(false);

    if (this.typingTimer) {
      this.typingTimer.remove(false);
    }
  }
}

import Phaser from "phaser";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;
const SPEED = 90;
const TALK_DISTANCE = 18;

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wizard!: Phaser.Physics.Arcade.Sprite;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private magePromptText?: Phaser.GameObjects.Text;

  constructor() {
    super("PlayScene");
  }

  preload() {
    this.load.image("tiles", "assets/tilemap.png");
    this.load.tilemapTiledJSON("map", "assets/lvl1MageColliders.json");
    this.load.image("playerSprite", "assets/player.png");
    this.load.image("wizard", "assets/wizard.png");
  }

  create() {
    const map = this.make.tilemap({ key: "map" });

    const tileset = map.addTilesetImage("tiles", "tiles");
    if (!tileset) throw new Error("Tileset no encontrado");

    const groundLayer = map.createLayer("Ground", tileset);
    if (!groundLayer) throw new Error("Layer 'Ground' no encontrada");

    const wallsLayer = map.createLayer("Walls", tileset);
    if (!wallsLayer) throw new Error("Layer 'Walls' no encontrada");

    const decorationLayer = map.createLayer("Decoration", tileset);
    if (!decorationLayer) throw new Error("Layer 'Decoration' no encontrada");

    wallsLayer.setCollisionByProperty({ collides: true });
    decorationLayer.setCollisionByProperty({ collides: true });

    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    cam.roundPixels = true;
    cam.stopFollow();
    cam.centerOn(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

    this.player = this.physics.add
      .sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, "playerSprite")
      .setScale(1);
    this.player.setCollideWorldBounds(true);

    this.wizard = this.physics.add
      .staticSprite(ROOM_WIDTH / 2 + 150, ROOM_HEIGHT / 2 + 40, "wizard")
      .setScale(1);

    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, decorationLayer);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.magePromptText = this.add
      .text(ROOM_WIDTH / 2, ROOM_HEIGHT - 12, "Presiona E para interactuar", {
        font: "10px monospace",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  update() {
    if (!this.player || !this.cursors) return;

    let vectorX = 0;
    let vectorY = 0;

    if (this.cursors.left?.isDown) {
      vectorX = -1;
      this.player.setFlipX(true);
      this.player.setAngle(-3);
    } else if (this.cursors.right?.isDown) {
      vectorX = 1;
      this.player.setFlipX(false);
      this.player.setAngle(3);
    }

    if (this.cursors.up?.isDown) {
      vectorY = -1;
      this.player.setAngle(2);
    } else if (this.cursors.down?.isDown) {
      vectorY = 1;
    } else if (vectorX === 0) {
      this.player.setAngle(0);
    }

    const vector = new Phaser.Math.Vector2(vectorX, vectorY)
      .normalize()
      .scale(SPEED);
    this.player.setVelocity(vector.x, vector.y);

    const distanceToMage = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.wizard.x,
      this.wizard.y,
    );

    const nearMage = distanceToMage < TALK_DISTANCE;
    this.magePromptText?.setVisible(nearMage);

    if (nearMage && Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
      this.scene.start("HubScene", { spawn: "default" });
    }
  }
}

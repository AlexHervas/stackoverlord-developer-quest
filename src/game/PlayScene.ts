import Phaser from "phaser";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wizard!: Phaser.Physics.Arcade.Sprite;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private talkingToMage: boolean = false;
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

    // Debug mapa
    console.log("[MAP]", {
      mapPixels: { w: map.widthInPixels, h: map.heightInPixels },
      expected: { w: ROOM_WIDTH, h: ROOM_HEIGHT },
      tileSize: { w: map.tileWidth, h: map.tileHeight },
    });

    /*
      const collidingTiles = wallsLayer.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => {
        const props = tile.properties as { collides?: boolean };
        return props.collides === true;
      }
    );
      console.log("Colliding tiles count:", collidingTiles.length);
    */

    wallsLayer.setCollisionByProperty({ collides: true });
    decorationLayer.setCollisionByProperty({ collides: true });

    // Límites fijos de room
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    // Cámara
    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    cam.roundPixels = true;
    cam.stopFollow();
    cam.centerOn(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

    // Player centrado de la sala
    this.player = this.physics.add
      .sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, "playerSprite")
      .setScale(1);

    this.player.setCollideWorldBounds(true);

    // NPC quieto (mago)
    this.wizard = this.physics.add
      .staticSprite(ROOM_WIDTH / 2 + 150, ROOM_HEIGHT / 2 + 40, "wizard")
      .setScale(1);

    // Colisiones
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, decorationLayer);

    // Alcanzar al mago
    this.physics.add.overlap(this.player, this.wizard, () => {
      this.talkingToMage = true;
    });

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys();

    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
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

    const speed = 90;
    let vectorX = 0,
      vectorY = 0;

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
    } else if (this.cursors.down?.isDown) vectorY = 1;
    else {
      if (vectorX === 0) this.player.setAngle(0);
    }

    // Normalizar vector para evitar velocidad diagonal mayor
    const vector = new Phaser.Math.Vector2(vectorX, vectorY)
      .normalize()
      .scale(speed);
    this.player.setVelocity(vector.x, vector.y);

    // Interacción con el mago, calcular distancia entre mago y player
    const distanceToMage = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.wizard.x,
      this.wizard.y
    );

    const TALK_DISTANCE = 18;
    const nearMage = distanceToMage < TALK_DISTANCE;

    this.magePromptText?.setVisible(nearMage);

    if (nearMage && Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
      console.log("¡Hablando con el mago!");
      this.scene.start("HubScene");
    }
  }
}

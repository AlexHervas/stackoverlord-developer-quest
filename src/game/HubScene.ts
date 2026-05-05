import Phaser from "phaser";
import { eventBus } from "./events/events";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;
const SPEED = 90;
const TALK_RANGE = 18;
const UI_FONT = "10px";
const TITLE_FONT = "12px";
const UI_STYLE = {
  fontFamily: "monospace",
  fontSize: UI_FONT,
  color: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.72)",
  padding: { x: 4, y: 2 },
};
const TITLE_STYLE = {
  fontFamily: "monospace",
  fontSize: TITLE_FONT,
  color: "#ffe7a2",
  backgroundColor: "rgba(0,0,0,0.72)",
  padding: { x: 4, y: 2 },
};

type HubAction = "cv" | "about" | "combat";
type HubSpawn = "default" | "arena";

export default class HubScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  private promptText?: Phaser.GameObjects.Text;

  private npcCv!: Phaser.Physics.Arcade.Sprite;
  private npcAbout!: Phaser.Physics.Arcade.Sprite;
  private npcCombat!: Phaser.Physics.Arcade.Sprite;
  private spawn: HubSpawn = "default";

  constructor() {
    super("HubScene");
  }

  init(data?: { spawn?: HubSpawn }) {
    this.spawn = data?.spawn ?? "default";
  }

  preload() {
    // Si ya cacheas esto en otra escena no pasa nada.
    this.load.image("tiles_image", "assets/tilemap.png");
    this.load.tilemapTiledJSON("lvl2", "assets/lvl2.json");
    this.load.image("playerSprite", "assets/player.png");

    this.load.image("cvNpc", "assets/cv_npc.png");
    this.load.image("aboutNpc", "assets/about_npc.png");
    this.load.image("arenaNpc", "assets/arena_npc.png");

    this.load.audio("interactSound", "assets/audio/select_001.ogg");
  }

  create() {
    const map = this.make.tilemap({ key: "lvl2" });
    const tileset = map.addTilesetImage("tiles_level2", "tiles_image");
    if (!tileset) throw new Error("Tileset no encontrado");

    const groundLayer = map.createLayer("Ground", tileset);
    const wallsLayer = map.createLayer("Walls", tileset);
    const decorationLayer = map.createLayer("Decoration", tileset);
    if (!groundLayer || !wallsLayer || !decorationLayer) {
      throw new Error("Faltan layers en hub.json");
    }

    wallsLayer.setCollisionByProperty({ collides: true });
    decorationLayer.setCollisionByProperty({ collides: true });

    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    cam.roundPixels = true;
    cam.stopFollow();
    cam.centerOn(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

    this.add.text(4, 2, "HUB", TITLE_STYLE).setScrollFactor(0).setDepth(20);

    this.add
      .text(ROOM_WIDTH - 4, 2, "ESC: VOLVER", {
        ...UI_STYLE,
        color: "#05F521",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(20);

    const spawnPoint = this.getPlayerSpawn();
    this.spawn = "default";
    this.player = this.physics.add
      .sprite(spawnPoint.x, spawnPoint.y, "playerSprite")
      .setScale(1);
    this.player.setFlipX(spawnPoint.flipX);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, decorationLayer);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );

    this.promptText = this.add
      .text(ROOM_WIDTH / 2, ROOM_HEIGHT - 12, "Pulsa E", {
        ...UI_STYLE,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(20);

    this.npcCv = this.physics.add.staticSprite(56, 75, "cvNpc").setScale(1);
    this.npcAbout = this.physics.add
      .staticSprite(136, 86, "aboutNpc")
      .setScale(1);
    this.npcCombat = this.physics.add
      .staticSprite(230, 40, "arenaNpc")
      .setScale(1);

    this.addNpcLabel(this.npcCv, "CV");
    this.addNpcLabel(this.npcAbout, "ABOUT");
    this.addNpcLabel(this.npcCombat, "ARENA");

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (!this.player || !this.cursors) return;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left?.isDown) {
      vx = -1;
      this.player.setFlipX(true);
    } else if (this.cursors.right?.isDown) {
      vx = 1;
      this.player.setFlipX(false);
    }

    if (this.cursors.up?.isDown) vy = -1;
    else if (this.cursors.down?.isDown) vy = 1;

    this.player.setAngle(vx === 0 ? 0 : vx < 0 ? -3 : 3);

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.cameras.main.fadeOut(250, 0, 0, 0);

      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
          this.spawn = "default";
          this.scene.start("PlayScene");
        },
      );
      return;
    }

    const action = this.getNearestNpcAction();
    this.promptText?.setVisible(action !== null);

    if (action && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.cache.audio.exists("interactSound")) {
        this.sound.play("interactSound", { volume: 0.2 });
      }

      if (action === "cv") {
        eventBus.emit("ui:open", { modal: "cv" });
      } else if (action === "about") {
        eventBus.emit("ui:open", { modal: "about" });
      } else if (action === "combat") {
        this.scene.start("CombatScene");
      }
    }
  }

  private getNearestNpcAction(): HubAction | null {
    const px = this.player.x;
    const py = this.player.y;

    const dCv = Phaser.Math.Distance.Between(
      px,
      py,
      this.npcCv.x,
      this.npcCv.y,
    );
    const dAbout = Phaser.Math.Distance.Between(
      px,
      py,
      this.npcAbout.x,
      this.npcAbout.y,
    );
    const dCombat = Phaser.Math.Distance.Between(
      px,
      py,
      this.npcCombat.x,
      this.npcCombat.y,
    );

    let min = dCv;
    let action: HubAction = "cv";

    if (dAbout < min) {
      min = dAbout;
      action = "about";
    }
    if (dCombat < min) {
      min = dCombat;
      action = "combat";
    }

    return min <= TALK_RANGE ? action : null;
  }

  private addNpcLabel(npc: Phaser.Physics.Arcade.Sprite, text: string) {
    this.add
      .text(npc.x, npc.y - 20, text, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#fff4bf",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private getPlayerSpawn() {
    if (this.spawn === "arena") {
      return {
        x: 250,
        y: 40,
        flipX: true,
      };
    }

    return {
      x: 0,
      y: ROOM_HEIGHT - 40,
      flipX: false,
    };
  }
}

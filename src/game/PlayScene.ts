import Phaser from "phaser";

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

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
  }

  update() {
    if (!this.cursors || !this.player) return;

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

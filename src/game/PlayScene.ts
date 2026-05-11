import Phaser from "phaser";
import { virtualInput } from "./input/virtualInput";
import { createMusicControl } from "./ui/musicControl";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;
const SPEED = 90;
const TALK_DISTANCE = 18;
const INTERACT_PROMPT = "E / A to interact";
const CONTINUE_PROMPT = "E / A";
const DIALOG_TEXT = "Welcome to my realm. The road ahead leads to the city.";
const UI_STYLE = {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.72)",
  padding: { x: 4, y: 2 },
  wordWrap: { width: 260 },
};
const DIALOG_BOX = {
  x: ROOM_WIDTH / 2,
  y: ROOM_HEIGHT - 10,
  width: 258,
  height: 52,
  textX: 44,
  textY: ROOM_HEIGHT - 50,
  textWidth: 232,
};
const TYPEWRITER_SPEED = 34;
const PLAY_AUDIO = {
  music: {
    key: "playSceneMusic",
    path: "assets/audio/playScene_theme.ogg",
    volume: 0.22,
  },
  speech: {
    key: "speechSound",
    path: "assets/audio/speech_sound.ogg",
    volume: 0.5,
    repeatDelay: 88,
  },
};
type DialogueState = "closed" | "opening" | "typing" | "ready";

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wizard!: Phaser.Physics.Arcade.Sprite;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private magePromptText?: Phaser.GameObjects.Text;
  private dialoguePanel?: Phaser.GameObjects.Rectangle;
  private dialogueText?: Phaser.GameObjects.Text;
  private continueText?: Phaser.GameObjects.Text;
  private musicControl?: ReturnType<typeof createMusicControl>;
  private isChangingScene = false;
  private dialogueState: DialogueState = "closed";
  private typedCharacterCount = 0;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private speechTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super("PlayScene");
  }

  preload() {
    this.load.image("tiles", "assets/tilemap.png");
    this.load.tilemapTiledJSON("map", "assets/lvl1MageColliders.json");
    this.load.image("playerSprite", "assets/player.png");
    this.load.image("wizard", "assets/wizard.png");
    this.load.audio(PLAY_AUDIO.music.key, PLAY_AUDIO.music.path);
    this.load.audio(PLAY_AUDIO.speech.key, PLAY_AUDIO.speech.path);
  }

  create() {
    virtualInput.clearActions();
    this.resetSceneState();
    const { wallsLayer, decorationLayer } = this.createRoomLayers();
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    this.configureCamera();
    this.createActors();
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, decorationLayer);

    this.setupInput();
    this.createMagePrompt();
    this.addMageLabel();
    this.createDialogueBox();
    this.createMusicControl();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.setupShutdownCleanup();
  }

  update() {
    if (!this.player || !this.cursors) return;

    const isDialogueOpen = this.dialogueState !== "closed";
    this.updatePlayerMovement(isDialogueOpen);

    const nearMage = this.isNearMage();
    if (!nearMage && isDialogueOpen) {
      this.closeDialogue();
      return;
    }

    this.magePromptText?.setVisible(
      nearMage && this.dialogueState === "closed",
    );

    this.handleMageInteraction(nearMage, this.isInteractJustPressed());
  }

  private resetSceneState() {
    this.isChangingScene = false;
    this.dialogueState = "closed";
    this.typedCharacterCount = 0;
  }

  private createRoomLayers() {
    const map = this.make.tilemap({ key: "map" });

    const tileset = map.addTilesetImage("tiles", "tiles");
    if (!tileset) throw new Error("Tileset no encontrado");

    const groundLayer = map.createLayer("Ground", tileset);
    if (!groundLayer) throw new Error("Layer 'Ground' no encontrada");

    const wallsLayer = map.createLayer("Walls", tileset);
    if (!wallsLayer) throw new Error("Layer 'Walls' no encontrada");

    const decorationLayer = map.createLayer("Decoration", tileset);
    if (!decorationLayer) throw new Error("Layer 'Decoration' no encontrada");

    groundLayer.setVisible(true);
    decorationLayer.setVisible(true);
    wallsLayer.setCollisionByProperty({ collides: true });
    decorationLayer.setCollisionByProperty({ collides: true });

    return { wallsLayer, decorationLayer };
  }

  private configureCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    cam.roundPixels = true;
    cam.stopFollow();
    cam.centerOn(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
  }

  private createActors() {
    this.player = this.physics.add
      .sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, "playerSprite")
      .setScale(1);
    this.player.setCollideWorldBounds(true);

    this.wizard = this.physics.add
      .staticSprite(ROOM_WIDTH / 2 + 150, ROOM_HEIGHT / 2 + 40, "wizard")
      .setScale(1);
  }

  private setupInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }

  private createMagePrompt() {
    this.magePromptText = this.add
      .text(ROOM_WIDTH / 2, ROOM_HEIGHT - 12, INTERACT_PROMPT, UI_STYLE)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
  }

  private addMageLabel() {
    this.add
      .text(this.wizard.x, this.wizard.y - 20, "MAGE", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#fff4bf",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private setupShutdownCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopDialogueTimers();
      this.musicControl?.destroy();
      this.musicControl = undefined;
    });
  }

  private updatePlayerMovement(isDialogueOpen: boolean) {
    let vectorX = 0;
    let vectorY = 0;
    const touchVector = virtualInput.getMoveVector();

    if (!isDialogueOpen) {
      if (
        this.cursors?.left?.isDown ||
        virtualInput.isDirectionDown("left")
      ) {
        vectorX = -1;
        this.player.setFlipX(true);
        this.player.setAngle(-3);
      } else if (
        this.cursors?.right?.isDown ||
        virtualInput.isDirectionDown("right")
      ) {
        vectorX = 1;
        this.player.setFlipX(false);
        this.player.setAngle(3);
      }

      if (this.cursors?.up?.isDown || virtualInput.isDirectionDown("up")) {
        vectorY = -1;
        this.player.setAngle(2);
      } else if (
        this.cursors?.down?.isDown ||
        virtualInput.isDirectionDown("down")
      ) {
        vectorY = 1;
      } else if (vectorX === 0) {
        this.player.setAngle(0);
      }

      if (touchVector.x !== 0 || touchVector.y !== 0) {
        vectorX = touchVector.x;
        vectorY = touchVector.y;

        if (touchVector.x < 0) {
          this.player.setFlipX(true);
          this.player.setAngle(-3);
        } else if (touchVector.x > 0) {
          this.player.setFlipX(false);
          this.player.setAngle(3);
        } else if (touchVector.y < 0) {
          this.player.setAngle(2);
        } else {
          this.player.setAngle(0);
        }
      }
    } else {
      this.player.setAngle(0);
    }

    const velocity = new Phaser.Math.Vector2(vectorX, vectorY);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);
  }

  private isNearMage() {
    return (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.wizard.x,
        this.wizard.y,
      ) < TALK_DISTANCE
    );
  }

  private handleMageInteraction(nearMage: boolean, interactPressed: boolean) {
    if (nearMage && !this.isChangingScene && interactPressed) {
      if (this.dialogueState === "closed") {
        this.openDialogue();
        return;
      }

      if (this.dialogueState === "typing") {
        this.completeDialogueText();
        return;
      }

      if (this.dialogueState === "ready") {
        this.startHubTransition();
      }
    }
  }

  private isInteractJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.interactKey!) ||
      virtualInput.consumeAction("primary")
    );
  }

  private createMusicControl() {
    this.musicControl = createMusicControl(this, PLAY_AUDIO.music, {
      x: ROOM_WIDTH - 4,
      y: 2,
      origin: [1, 0],
      scrollFactor: 0,
      depth: 20,
      style: {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { x: 4, y: 2 },
      },
    });
  }

  private createDialogueBox() {
    this.dialoguePanel = this.add
      .rectangle(
        DIALOG_BOX.x,
        DIALOG_BOX.y,
        DIALOG_BOX.width,
        DIALOG_BOX.height,
        0x2b1a10,
        0.9,
      )
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0xd6b06a, 0.85)
      .setDepth(30)
      .setScale(1, 0)
      .setVisible(false);

    this.dialogueText = this.add
      .text(DIALOG_BOX.textX, DIALOG_BOX.textY, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f8efe0",
        wordWrap: { width: DIALOG_BOX.textWidth },
      })
      .setDepth(31)
      .setVisible(false);

    this.continueText = this.add
      .text(ROOM_WIDTH - 44, ROOM_HEIGHT - 19, CONTINUE_PROMPT, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffe7a2",
      })
      .setOrigin(1, 0.5)
      .setDepth(31)
      .setVisible(false);
  }

  private openDialogue() {
    if (!this.dialoguePanel || !this.dialogueText) return;

    this.dialogueState = "opening";
    this.magePromptText?.setVisible(false);
    this.dialogueText.setText("").setVisible(false);
    this.continueText?.setVisible(false);
    this.dialoguePanel.setScale(1, 0).setVisible(true);

    this.tweens.add({
      targets: this.dialoguePanel,
      scaleY: 1,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => this.startTypewriter(),
    });
  }

  private startTypewriter() {
    if (!this.dialogueText) return;

    this.dialogueState = "typing";
    this.typedCharacterCount = 0;
    this.dialogueText.setText("").setVisible(true);
    this.startSpeechLoop();

    this.typewriterTimer = this.time.addEvent({
      delay: TYPEWRITER_SPEED,
      repeat: DIALOG_TEXT.length - 1,
      callback: () => {
        this.typedCharacterCount += 1;
        this.dialogueText?.setText(
          DIALOG_TEXT.slice(0, this.typedCharacterCount),
        );

        if (this.typedCharacterCount >= DIALOG_TEXT.length) {
          this.finishTypewriter();
        }
      },
    });
  }

  private completeDialogueText() {
    if (!this.dialogueText) return;

    this.typewriterTimer?.remove(false);
    this.dialogueText.setText(DIALOG_TEXT);
    this.finishTypewriter();
  }

  private finishTypewriter() {
    if (this.dialogueState === "ready") return;

    this.dialogueState = "ready";
    this.stopDialogueTimers();
    this.continueText?.setVisible(true);
  }

  private startSpeechLoop() {
    if (!this.cache.audio.exists(PLAY_AUDIO.speech.key)) return;

    this.sound.play(PLAY_AUDIO.speech.key, {
      volume: PLAY_AUDIO.speech.volume,
    });

    this.speechTimer = this.time.addEvent({
      delay: PLAY_AUDIO.speech.repeatDelay,
      loop: true,
      callback: () => {
        this.sound.play(PLAY_AUDIO.speech.key, {
          volume: PLAY_AUDIO.speech.volume,
        });
      },
    });
  }

  private stopDialogueTimers() {
    this.typewriterTimer?.remove(false);
    this.speechTimer?.remove(false);
    this.typewriterTimer = undefined;
    this.speechTimer = undefined;
  }

  private closeDialogue() {
    this.stopDialogueTimers();
    this.dialogueState = "closed";
    this.typedCharacterCount = 0;
    this.dialoguePanel?.setVisible(false);
    this.dialogueText?.setText("").setVisible(false);
    this.continueText?.setVisible(false);
  }

  private startHubTransition() {
    this.isChangingScene = true;
    this.closeDialogue();
    this.musicControl?.stop();
    virtualInput.clearActions();

    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start("HubScene", { spawn: "default" });
      },
    );
  }
}

import Phaser from "phaser";
import { eventBus, type UiModal } from "./events/events";
import { getInteractHint } from "./input/inputMode";
import { virtualInput } from "./input/virtualInput";
import {
  formatRankingRows,
  getBestScore,
  getPlayerId,
  loadRanking,
} from "./combat/ranking";
import { createMusicControl } from "./ui/musicControl";

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 160;
const SPEED = 90;
const TALK_RANGE = 18;
const UI_FONT = "10px";
const ARENA_DIALOG_TEXT =
  "Only the finest survive this floor.\nReach round 10 and face the Stack Overlord.\nEnter ready, or do not enter at all.";
const ARENA_DIALOG = {
  x: ROOM_WIDTH / 2,
  y: ROOM_HEIGHT - 6,
  width: 280,
  height: 104,
  textWidth: 250,
};
const ARENA_DIALOG_OPTION_WIDTH = 70;
const ARENA_RANKING_X = ARENA_DIALOG.x - ARENA_DIALOG.textWidth / 2 + 22;
const ARENA_CONTENT_RAISE = 8;
const ARENA_RANKING_Y = ARENA_DIALOG.y - 69 - ARENA_CONTENT_RAISE;
const TYPEWRITER_SPEED = 34;
const UI_STYLE = {
  fontFamily: "monospace",
  fontSize: UI_FONT,
  color: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.72)",
  padding: { x: 4, y: 2 },
};
const HUB_AUDIO = {
  music: {
    key: "hubSceneMusic",
    path: "assets/audio/hubScene_theme.ogg",
    volume: 0.22,
  },
  speech: {
    key: "speechSound",
    path: "assets/audio/speech_sound.ogg",
    volume: 0.5,
    repeatDelay: 88,
  },
};

type HubAction = "cv" | "about" | "combat";
type HubSpawn = "default" | "arena";
type ArenaDialogueState = "closed" | "opening" | "typing" | "ready";
type ArenaDialogMode = "intro" | "ranking";

export default class HubScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private interactKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  private promptText?: Phaser.GameObjects.Text;
  private arenaDialog?: Phaser.GameObjects.Container;
  private arenaDialogPanel?: Phaser.GameObjects.Rectangle;
  private arenaDialogText?: Phaser.GameObjects.Text;
  private arenaDialogOptions: Array<
    Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text
  > = [];
  private arenaRankingText?: Phaser.GameObjects.Text;
  private arenaRankingBackOption: Array<
    Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text
  > = [];
  private isArenaDialogOpen = false;
  private arenaDialogueState: ArenaDialogueState = "closed";
  private arenaDialogMode: ArenaDialogMode = "intro";
  private isArenaRankingLoading = false;
  private typedArenaCharacterCount = 0;
  private arenaTypewriterTimer?: Phaser.Time.TimerEvent;
  private arenaSpeechTimer?: Phaser.Time.TimerEvent;

  private npcCv!: Phaser.Physics.Arcade.Sprite;
  private npcAbout!: Phaser.Physics.Arcade.Sprite;
  private npcCombat!: Phaser.Physics.Arcade.Sprite;
  private musicControl?: ReturnType<typeof createMusicControl>;
  private removeUiCloseListener?: () => void;
  private isNpcModalOpen = false;
  private shouldIgnoreNextEsc = false;
  private spawn: HubSpawn = "default";

  constructor() {
    super("HubScene");
  }

  init(data?: { spawn?: HubSpawn }) {
    this.spawn = data?.spawn ?? "default";
  }

  preload() {
    // Re-loading cached assets is safe when returning to this scene.
    this.load.image("tiles_image", "assets/tilemap.png");
    this.load.tilemapTiledJSON("lvl2", "assets/lvl2.json");
    this.load.image("playerSprite", "assets/player.png");

    this.load.image("cvNpc", "assets/cv_npc.png");
    this.load.image("aboutNpc", "assets/about_npc.png");
    this.load.image("arenaNpc", "assets/arena_npc.png");

    this.load.audio("interactSound", "assets/audio/select_001.ogg");
    this.load.audio(HUB_AUDIO.music.key, HUB_AUDIO.music.path);
    this.load.audio(HUB_AUDIO.speech.key, HUB_AUDIO.speech.path);
  }

  create() {
    virtualInput.clearActions();
    this.resetArenaDialogState();
    const map = this.make.tilemap({ key: "lvl2" });
    const tileset = map.addTilesetImage("tiles_level2", "tiles_image");
    if (!tileset) throw new Error("Tileset not found");

    const groundLayer = map.createLayer("Ground", tileset);
    const wallsLayer = map.createLayer("Walls", tileset);
    const decorationLayer = map.createLayer("Decoration", tileset);
    if (!groundLayer || !wallsLayer || !decorationLayer) {
      throw new Error("Missing layers in lvl2.json");
    }

    wallsLayer.setCollisionByProperty({ collides: true });
    decorationLayer.setCollisionByProperty({ collides: true });

    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    cam.roundPixels = true;
    cam.stopFollow();
    cam.centerOn(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

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
      .text(ROOM_WIDTH / 2, ROOM_HEIGHT - 12, getInteractHint(), {
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

    this.physics.add.collider(this.player, this.npcCv);
    this.physics.add.collider(this.player, this.npcAbout);
    this.physics.add.collider(this.player, this.npcCombat);

    this.addNpcLabel(this.npcCv, "CV");
    this.addNpcLabel(this.npcAbout, "ABOUT");
    this.addNpcLabel(this.npcCombat, "ARENA");
    this.createMusicControl();

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.setupUiModalEvents();
    this.setupShutdownCleanup();
  }

  update() {
    if (!this.player || !this.cursors) return;

    if (this.isNpcModalOpen || this.isArenaDialogOpen) {
      this.pausePlayerMovement();
      this.promptText?.setVisible(false);
      if (this.isArenaDialogOpen) this.handleArenaDialogInput();
      return;
    }

    let vx = 0;
    let vy = 0;
    const touchVector = virtualInput.getMoveVector();

    if (this.cursors.left?.isDown || virtualInput.isDirectionDown("left")) {
      vx = -1;
      this.player.setFlipX(true);
    } else if (
      this.cursors.right?.isDown ||
      virtualInput.isDirectionDown("right")
    ) {
      vx = 1;
      this.player.setFlipX(false);
    }

    if (this.cursors.up?.isDown || virtualInput.isDirectionDown("up")) {
      vy = -1;
    } else if (
      this.cursors.down?.isDown ||
      virtualInput.isDirectionDown("down")
    ) {
      vy = 1;
    }

    if (touchVector.x !== 0 || touchVector.y !== 0) {
      vx = touchVector.x;
      vy = touchVector.y;
    }

    this.player.setAngle(vx === 0 ? 0 : vx < 0 ? -3 : 3);
    if (touchVector.x < 0) this.player.setFlipX(true);
    if (touchVector.x > 0) this.player.setFlipX(false);

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);

    const backPressed = this.isBackJustPressed();
    const interactPressed = this.isInteractJustPressed();

    if (backPressed) {
      if (this.shouldIgnoreNextEsc) {
        this.shouldIgnoreNextEsc = false;
        return;
      }

      this.musicControl?.stop();
      virtualInput.clearActions();
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

    if (action && interactPressed) {
      if (this.cache.audio.exists("interactSound")) {
        this.sound.play("interactSound", { volume: 0.2 });
      }

      if (action === "cv") {
        this.openNpcModal("cv");
      } else if (action === "about") {
        this.openNpcModal("about");
      } else if (action === "combat") {
        this.openArenaDialog();
      }
    }
  }

  private isBackJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      virtualInput.consumeAction("back")
    );
  }

  private isInteractJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      virtualInput.consumeAction("primary")
    );
  }

  private createMusicControl() {
    this.musicControl = createMusicControl(this, HUB_AUDIO.music, {
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

  private setupUiModalEvents() {
    this.removeUiCloseListener = eventBus.on("ui:close", () => {
      if (this.isNpcModalOpen) {
        this.shouldIgnoreNextEsc = true;
      }

      this.isNpcModalOpen = false;
    });
  }

  private setupShutdownCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeUiCloseListener?.();
      this.removeUiCloseListener = undefined;
      this.stopArenaDialogueTimers();
      this.arenaDialog?.destroy(true);
      this.arenaDialog = undefined;
      this.musicControl?.destroy();
      this.musicControl = undefined;
    });
  }

  private openNpcModal(modal: UiModal) {
    this.isNpcModalOpen = true;
    this.pausePlayerMovement();
    this.promptText?.setVisible(false);
    eventBus.emit("ui:open", { modal });
  }

  private openArenaDialog() {
    this.isArenaDialogOpen = true;
    this.arenaDialogueState = "opening";
    this.arenaDialogMode = "intro";
    this.isArenaRankingLoading = false;
    this.typedArenaCharacterCount = 0;
    this.pausePlayerMovement();
    this.promptText?.setVisible(false);
    this.arenaDialog ??= this.createArenaDialog();
    this.arenaDialogText?.setText("").setVisible(false);
    this.setArenaDialogOptionsVisible(false);
    this.setArenaRankingVisible(false);
    this.arenaDialogPanel?.setScale(1, 0);
    this.arenaDialog.setVisible(true);

    this.tweens.add({
      targets: this.arenaDialogPanel,
      scaleY: 1,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => this.startArenaTypewriter(),
    });
  }

  private closeArenaDialog() {
    this.resetArenaDialogState();
    virtualInput.clearActions();
  }

  private resetArenaDialogState() {
    this.stopArenaDialogueTimers();
    this.isArenaDialogOpen = false;
    this.arenaDialogueState = "closed";
    this.arenaDialogMode = "intro";
    this.isArenaRankingLoading = false;
    this.typedArenaCharacterCount = 0;
    this.arenaDialog?.setVisible(false);
    this.arenaDialogText?.setText("").setVisible(false);
    this.setArenaDialogOptionsVisible(false);
    this.setArenaRankingVisible(false);
  }

  private enterArena() {
    this.resetArenaDialogState();
    this.musicControl?.stop();
    virtualInput.clearActions();
    this.scene.start("CombatScene", { forceAttackModeSelection: true });
  }

  private handleArenaDialogInput() {
    if (this.arenaDialogMode === "ranking") {
      if (this.isBackJustPressed() || this.isInteractJustPressed()) {
        this.showArenaIntroOptions();
      }
      return;
    }

    if (this.arenaDialogueState === "typing" && this.isInteractJustPressed()) {
      this.completeArenaDialogueText();
      return;
    }

    if (this.arenaDialogueState !== "ready") {
      if (this.isBackJustPressed()) this.closeArenaDialog();
      return;
    }

    if (this.isInteractJustPressed()) {
      this.enterArena();
      return;
    }

    if (this.isBackJustPressed()) this.closeArenaDialog();
  }

  private createArenaDialog() {
    const container = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);

    const panel = this.add
      .rectangle(
        ARENA_DIALOG.x,
        ARENA_DIALOG.y,
        ARENA_DIALOG.width,
        ARENA_DIALOG.height,
        0x2b1a10,
        0.92,
      )
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0xd6b06a, 0.85);
    this.arenaDialogPanel = panel;

    const title = this.add
      .text(
        ARENA_DIALOG.x,
        ARENA_DIALOG.y - 84 - ARENA_CONTENT_RAISE,
        "ARENA GUARDIAN",
        {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffe7a2",
        },
      )
      .setOrigin(0.5, 0);

    const dialogue = this.add
      .text(
        ARENA_DIALOG.x,
        ARENA_DIALOG.y - 66 - ARENA_CONTENT_RAISE,
        "",
        {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#f8efe0",
          align: "center",
          wordWrap: { width: ARENA_DIALOG.textWidth },
        },
      )
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.arenaDialogText = dialogue;

    const enterOption = this.createArenaDialogOption(
      ARENA_DIALOG.x - 80,
      ARENA_DIALOG.y - 17 - ARENA_CONTENT_RAISE,
      "ENTER",
      () => this.enterArena(),
    );
    const leaveOption = this.createArenaDialogOption(
      ARENA_DIALOG.x + 80,
      ARENA_DIALOG.y - 17 - ARENA_CONTENT_RAISE,
      "LEAVE",
      () => this.closeArenaDialog(),
    );
    const rankingOption = this.createArenaDialogOption(
      ARENA_DIALOG.x,
      ARENA_DIALOG.y - 17 - ARENA_CONTENT_RAISE,
      "RANKING",
      () => {
        void this.showArenaRanking();
      },
    );
    const rankingText = this.add
      .text(ARENA_RANKING_X, ARENA_RANKING_Y, "", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f8efe0",
        align: "left",
      })
      .setOrigin(0, 0)
      .setVisible(false);
    this.arenaRankingText = rankingText;
    const rankingBackOption = this.createArenaDialogOption(
      ARENA_DIALOG.x + ARENA_DIALOG.width / 2 - 34,
      ARENA_DIALOG.y - ARENA_DIALOG.height + 12,
      "BACK",
      () => this.showArenaIntroOptions(),
      54,
      16,
    );
    this.arenaDialogOptions = [...enterOption, ...rankingOption, ...leaveOption];
    this.arenaRankingBackOption = [...rankingBackOption];
    this.setArenaDialogOptionsVisible(false);
    this.setArenaRankingVisible(false);

    container.add([
      panel,
      title,
      dialogue,
      rankingText,
      ...enterOption,
      ...rankingOption,
      ...leaveOption,
      ...rankingBackOption,
    ]);

    return container;
  }

  private createArenaDialogOption(
    x: number,
    y: number,
    label: string,
    onSelect: () => void,
    width = ARENA_DIALOG_OPTION_WIDTH,
    height = 20,
  ): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text] {
    const background = this.add
      .rectangle(x, y, width, height, 0x3a2418, 1)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0xffe7a2, 0.75)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: height < 20 ? "8px" : "9px",
        color: "#ffe7a2",
      })
      .setOrigin(0.5);

    background.on("pointerover", () => background.setFillStyle(0x4f2d16, 1));
    background.on("pointerout", () => background.setFillStyle(0x3a2418, 1));
    background.on("pointerdown", onSelect);

    return [background, text];
  }

  private startArenaTypewriter() {
    if (!this.arenaDialogText) return;

    this.arenaDialogueState = "typing";
    this.typedArenaCharacterCount = 0;
    this.arenaDialogText.setText("").setVisible(true);
    this.startArenaSpeechLoop();

    this.arenaTypewriterTimer = this.time.addEvent({
      delay: TYPEWRITER_SPEED,
      repeat: ARENA_DIALOG_TEXT.length - 1,
      callback: () => {
        this.typedArenaCharacterCount += 1;
        this.arenaDialogText?.setText(
          ARENA_DIALOG_TEXT.slice(0, this.typedArenaCharacterCount),
        );

        if (this.typedArenaCharacterCount >= ARENA_DIALOG_TEXT.length) {
          this.finishArenaTypewriter();
        }
      },
    });
  }

  private completeArenaDialogueText() {
    if (!this.arenaDialogText) return;

    this.arenaTypewriterTimer?.remove(false);
    this.arenaDialogText.setText(ARENA_DIALOG_TEXT);
    this.finishArenaTypewriter();
  }

  private finishArenaTypewriter() {
    if (this.arenaDialogueState === "ready") return;

    this.arenaDialogueState = "ready";
    this.stopArenaDialogueTimers();
    this.setArenaDialogOptionsVisible(true);
  }

  private async showArenaRanking() {
    if (this.isArenaRankingLoading) return;

    this.arenaDialogMode = "ranking";
    this.isArenaRankingLoading = true;
    this.stopArenaDialogueTimers();
    this.arenaDialogText?.setVisible(false);
    this.setArenaDialogOptionsVisible(false);
    this.arenaRankingText?.setText("LOADING RANKING...").setVisible(true);
    this.setArenaRankingBackVisible(false);

    const playerId = getPlayerId();
    const [ranking, bestScore] = await Promise.all([
      loadRanking(),
      getBestScore(playerId),
    ]);
    if (!this.scene.isActive() || this.arenaDialogMode !== "ranking") return;

    const rows = formatRankingColumns(formatRankingRows(ranking));
    const bestScoreText = bestScore.hasBestScore
      ? `YOUR BEST: ${bestScore.score}`
      : "YOUR BEST: NONE";
    this.arenaRankingText
      ?.setText([`TOP 10 ARENA   ${bestScoreText}`, "", ...rows].join("\n"))
      .setVisible(true);
    this.setArenaRankingBackVisible(true);
    this.isArenaRankingLoading = false;
  }

  private showArenaIntroOptions() {
    this.arenaDialogMode = "intro";
    this.isArenaRankingLoading = false;
    this.arenaRankingText?.setVisible(false);
    this.setArenaRankingBackVisible(false);
    this.arenaDialogText?.setText(ARENA_DIALOG_TEXT).setVisible(true);
    this.arenaDialogueState = "ready";
    this.setArenaDialogOptionsVisible(true);
    virtualInput.clearActions();
  }

  private startArenaSpeechLoop() {
    if (!this.cache.audio.exists(HUB_AUDIO.speech.key)) return;

    this.sound.play(HUB_AUDIO.speech.key, {
      volume: HUB_AUDIO.speech.volume,
    });

    this.arenaSpeechTimer = this.time.addEvent({
      delay: HUB_AUDIO.speech.repeatDelay,
      loop: true,
      callback: () => {
        this.sound.play(HUB_AUDIO.speech.key, {
          volume: HUB_AUDIO.speech.volume,
        });
      },
    });
  }

  private stopArenaDialogueTimers() {
    this.arenaTypewriterTimer?.remove(false);
    this.arenaSpeechTimer?.remove(false);
    this.arenaTypewriterTimer = undefined;
    this.arenaSpeechTimer = undefined;
  }

  private setArenaDialogOptionsVisible(isVisible: boolean) {
    this.arenaDialogOptions.forEach((option) => option.setVisible(isVisible));
  }

  private setArenaRankingVisible(isVisible: boolean) {
    this.arenaRankingText?.setVisible(isVisible);
    this.setArenaRankingBackVisible(isVisible);
  }

  private setArenaRankingBackVisible(isVisible: boolean) {
    this.arenaRankingBackOption.forEach((option) => option.setVisible(isVisible));
  }

  private pausePlayerMovement() {
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
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

function formatRankingColumns(rows: string[]) {
  const normalizedRows = rows.slice(0, 10);
  const leftRows = normalizedRows.slice(0, 5);
  const rightRows = normalizedRows.slice(5, 10);
  const leftWidth = Math.max(...leftRows.map((row) => row.length), 18);

  return leftRows.map((leftRow, index) => {
    const rightRow = rightRows[index];
    return rightRow
      ? `${leftRow.padEnd(leftWidth, " ")}   ${rightRow}`
      : leftRow;
  });
}

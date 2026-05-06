import Phaser from "phaser";

const MENU_COLORS = {
  background: "#15100b",
  panel: 0xf2d58a,
  panelBorder: 0x4f2d16,
  panelShadow: 0x080503,
  panelInner: 0xd3a45f,
  title: "#241107",
  accent: "#145c2a",
  muted: "#3d1f0f",
  footer: "#ffe7a2",
  highlight: 0xffe7a2,
};

const MENU_AUDIO = {
  select: {
    key: "menuSelectSound",
    path: "assets/audio/select_001.ogg",
    volume: 0.22,
  },
  music: {
    key: "menuMusic",
    path: "assets/audio/menu_theme.ogg",
    volume: 0.16,
  },
};

export default class MenuScene extends Phaser.Scene {
  private menuMusic?: Phaser.Sound.BaseSound;
  private musicControlText?: Phaser.GameObjects.Text;
  private isMusicEnabled = false;

  constructor() {
    super("MenuScene");
  }

  preload() {
    if (!this.cache.audio.exists(MENU_AUDIO.select.key)) {
      this.load.audio(MENU_AUDIO.select.key, MENU_AUDIO.select.path);
    }

    if (!this.cache.audio.exists(MENU_AUDIO.music.key)) {
      this.load.audio(MENU_AUDIO.music.key, MENU_AUDIO.music.path);
    }
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(MENU_COLORS.background);
    this.createBackground(width, height);
    this.createTitle(width, height);
    this.createPrompt(width, height);
    this.createMusicControl(width, height);

    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    this.input.keyboard?.on("keydown-M", this.toggleMenuMusic, this);
  }

  private createBackground(width: number, height: number) {
    const graphics = this.add.graphics();

    graphics.fillStyle(MENU_COLORS.panelShadow, 0.45);
    graphics.fillRect(0, 0, width, height);

    graphics.fillStyle(MENU_COLORS.panelBorder, 1);
    graphics.fillRect(13, 25, width - 26, 98);

    graphics.fillStyle(MENU_COLORS.panelInner, 1);
    graphics.fillRect(16, 28, width - 32, 92);

    graphics.fillStyle(MENU_COLORS.panel, 1);
    graphics.fillRect(19, 31, width - 38, 86);

    graphics.fillStyle(MENU_COLORS.highlight, 0.5);
    graphics.fillRect(21, 33, width - 42, 1);
    graphics.fillRect(21, 33, 1, 82);

    graphics.fillStyle(0x6f3f1e, 0.28);
    for (let x = 24; x < width - 24; x += 17) {
      const y = 36 + ((x * 5) % 69);
      graphics.fillRect(x, y, 1, 1);
    }

    graphics.lineStyle(1, 0x7a431f, 0.5);
    graphics.beginPath();
    graphics.moveTo(28, 36);
    graphics.lineTo(width - 28, 36);
    graphics.moveTo(28, 113);
    graphics.lineTo(width - 28, 113);
    graphics.strokePath();
  }

  private createTitle(width: number, height: number) {
    this.add
      .text(width / 2, height / 2 - 35, "StackOverlord", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: MENU_COLORS.title,
        stroke: "#ffe7a2",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 12, "Developer Quest", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: MENU_COLORS.muted,
      })
      .setOrigin(0.5);
  }

  private createPrompt(width: number, height: number) {
    const keyText = this.add
      .text(width / 2, height / 2 + 24, "Press Enter to start", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: MENU_COLORS.accent,
        stroke: "#f8df9b",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: keyText,
      alpha: 0.62,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height / 2 + 47, "Arrow keys to move", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: MENU_COLORS.footer,
        stroke: "#4f2d16",
        strokeThickness: 1,
      })
      .setOrigin(0.5);
  }

  private startGame() {
    this.menuMusic?.stop();

    if (this.cache.audio.exists(MENU_AUDIO.select.key)) {
      this.sound.play(MENU_AUDIO.select.key, {
        volume: MENU_AUDIO.select.volume,
      });
    }

    this.cameras.main.fadeOut(180, 21, 16, 11);
    this.time.delayedCall(180, () => {
      this.scene.start("PlayScene");
    });
  }

  private createMusicControl(width: number, height: number) {
    this.musicControlText = this.add
      .text(width / 2, height / 2 + 61, "[M] MUSIC OFF", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: MENU_COLORS.footer,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.musicControlText.on("pointerdown", () => this.toggleMenuMusic());
  }

  private toggleMenuMusic() {
    if (!this.cache.audio.exists(MENU_AUDIO.music.key)) return;

    if (!this.menuMusic) {
      this.menuMusic = this.sound.add(MENU_AUDIO.music.key, {
        loop: true,
        volume: MENU_AUDIO.music.volume,
      });
    }

    if (this.isMusicEnabled) {
      this.menuMusic.pause();
      this.isMusicEnabled = false;
      this.updateMusicControlText();
      return;
    }

    if (this.menuMusic.isPaused) {
      this.menuMusic.resume();
    } else {
      this.menuMusic.play();
    }

    this.isMusicEnabled = true;
    this.updateMusicControlText();
  }

  private updateMusicControlText() {
    this.musicControlText?.setText(
      this.isMusicEnabled ? "[M] MUSIC ON" : "[M] MUSIC OFF",
    );
  }
}

import Phaser from "phaser";

type MusicConfig = {
  key: string;
  volume: number;
};

type MusicControlOptions = {
  x: number;
  y: number;
  style: Phaser.Types.GameObjects.Text.TextStyle;
  origin?: [number, number];
  depth?: number;
  scrollFactor?: number;
  canToggle?: () => boolean;
};

type MusicControl = {
  stop: () => void;
  destroy: () => void;
};

export function createMusicControl(
  scene: Phaser.Scene,
  musicConfig: MusicConfig,
  options: MusicControlOptions,
): MusicControl {
  let music: Phaser.Sound.BaseSound | undefined;
  let isMusicEnabled = false;

  const controlText = scene.add
    .text(options.x, options.y, "[M] MUSIC OFF", options.style)
    .setOrigin(...(options.origin ?? [0.5, 0.5]))
    .setInteractive({ useHandCursor: true });

  if (options.depth !== undefined) {
    controlText.setDepth(options.depth);
  }

  if (options.scrollFactor !== undefined) {
    controlText.setScrollFactor(options.scrollFactor);
  }

  const updateText = () => {
    controlText.setText(isMusicEnabled ? "[M] MUSIC ON" : "[M] MUSIC OFF");
  };

  const toggle = () => {
    if (options.canToggle && !options.canToggle()) return;
    if (!scene.cache.audio.exists(musicConfig.key)) return;

    if (!music) {
      music = scene.sound.add(musicConfig.key, {
        loop: true,
        volume: musicConfig.volume,
      });
    }

    if (isMusicEnabled) {
      music.pause();
      isMusicEnabled = false;
      updateText();
      return;
    }

    if (music.isPaused) {
      music.resume();
    } else {
      music.play();
    }

    isMusicEnabled = true;
    updateText();
  };

  controlText.on("pointerdown", toggle);
  scene.input.keyboard?.on("keydown-M", toggle);

  return {
    stop: () => {
      music?.stop();
      isMusicEnabled = false;
      updateText();
    },
    destroy: () => {
      scene.input.keyboard?.off("keydown-M", toggle);
      controlText.off("pointerdown", toggle);
      controlText.destroy();
      music?.stop();
      music?.destroy();
      music = undefined;
    },
  };
}

import Phaser from "phaser";
import { getMusicHint } from "../input/inputMode";
import { virtualInput } from "../input/virtualInput";

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
  initialEnabled?: boolean;
  onEnabledChange?: (isEnabled: boolean) => void;
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
  let isMusicEnabled = options.initialEnabled ?? false;

  const controlText = scene.add
    .text(options.x, options.y, getMusicHint(isMusicEnabled), options.style)
    .setOrigin(...(options.origin ?? [0.5, 0.5]))
    .setInteractive({ useHandCursor: true });

  if (options.depth !== undefined) {
    controlText.setDepth(options.depth);
  }

  if (options.scrollFactor !== undefined) {
    controlText.setScrollFactor(options.scrollFactor);
  }

  const updateText = () => {
    controlText.setText(getMusicHint(isMusicEnabled));
  };

  const setEnabled = (isEnabled: boolean) => {
    isMusicEnabled = isEnabled;
    options.onEnabledChange?.(isMusicEnabled);
    updateText();
  };

  const ensureMusic = () => {
    if (!scene.cache.audio.exists(musicConfig.key)) return false;

    if (!music) {
      music = scene.sound.add(musicConfig.key, {
        loop: true,
        volume: musicConfig.volume,
      });
    }

    return true;
  };

  const playMusic = () => {
    if (!ensureMusic()) return false;

    if (music?.isPaused) {
      music.resume();
    } else if (!music?.isPlaying) {
      music?.play();
    }

    return true;
  };

  const toggle = () => {
    if (options.canToggle && !options.canToggle()) return;

    if (isMusicEnabled) {
      music?.pause();
      setEnabled(false);
      return;
    }

    if (playMusic()) setEnabled(true);
  };

  if (isMusicEnabled && !playMusic()) setEnabled(false);

  controlText.on("pointerdown", toggle);
  scene.input.keyboard?.on("keydown-M", toggle);
  const offVirtualMusic = virtualInput.onAction("music", toggle);

  return {
    stop: () => {
      music?.stop();
      setEnabled(false);
    },
    destroy: () => {
      offVirtualMusic();
      scene.input.keyboard?.off("keydown-M", toggle);
      controlText.off("pointerdown", toggle);
      controlText.destroy();
      music?.stop();
      music?.destroy();
      music = undefined;
    },
  };
}

import Phaser from "phaser";
import { unlockAudio } from "../audio/unlockAudio";
import { getMusicHint } from "../input/inputMode";
import { virtualInput } from "../input/virtualInput";
import { getMusicEnabled, setMusicEnabled } from "./musicState";

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
  let isMusicEnabled = options.initialEnabled ?? getMusicEnabled();
  let isDestroyed = false;

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
    if (isDestroyed) return;
    controlText.setText(getMusicHint(isMusicEnabled));
  };

  const setEnabled = (isEnabled: boolean) => {
    if (isDestroyed) return;
    isMusicEnabled = isEnabled;
    if (options.onEnabledChange) {
      options.onEnabledChange(isMusicEnabled);
    } else {
      setMusicEnabled(isMusicEnabled);
    }
    updateText();
  };

  const ensureMusic = () => {
    if (isDestroyed) return false;
    if (!scene.cache.audio.exists(musicConfig.key)) return false;

    if (!music) {
      music = scene.sound.add(musicConfig.key, {
        loop: true,
        volume: musicConfig.volume,
      });
    }

    return true;
  };

  const playMusic = async () => {
    if (!ensureMusic()) return false;

    await unlockAudio(scene);
    if (isDestroyed) return false;

    if (music?.isPaused) {
      music.resume();
    } else if (!music?.isPlaying) {
      music?.play();
    }

    return music?.isPlaying ?? false;
  };

  const toggle = async () => {
    if (options.canToggle && !options.canToggle()) return;

    if (isMusicEnabled) {
      music?.pause();
      setEnabled(false);
      return;
    }

    const didPlay = await playMusic();
    if (didPlay) setEnabled(true);
  };

  if (isMusicEnabled) {
    void playMusic().then((didPlay) => {
      if (!didPlay) setEnabled(false);
    });
  }

  const handleToggle = () => void toggle();

  controlText.on("pointerdown", handleToggle);
  scene.input.keyboard?.on("keydown-M", handleToggle);
  const offVirtualMusic = virtualInput.onAction("music", handleToggle);

  return {
    stop: () => {
      music?.stop();
      updateText();
    },
    destroy: () => {
      isDestroyed = true;
      offVirtualMusic();
      scene.input.keyboard?.off("keydown-M", handleToggle);
      controlText.off("pointerdown", handleToggle);
      controlText.destroy();
      music?.stop();
      music?.destroy();
      music = undefined;
    },
  };
}

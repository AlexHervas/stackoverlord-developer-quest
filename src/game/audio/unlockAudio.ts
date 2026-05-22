import Phaser from "phaser";

type UnlockableSoundManager = Phaser.Sound.BaseSoundManager & {
  locked?: boolean;
  unlock?: () => void | Promise<void>;
  context?: AudioContext;
};

export async function unlockAudio(scene: Phaser.Scene): Promise<boolean> {
  const sound = scene.sound as UnlockableSoundManager;

  try {
    await sound.unlock?.();
  } catch {
    // Safari can reject unlock attempts outside a valid user gesture.
  }

  if (sound.context?.state === "closed") return false;

  if (sound.context && sound.context.state !== "running") {
    try {
      await sound.context.resume();
    } catch {
      // Keep the game playable even if the browser keeps audio locked.
    }
  }

  return sound.locked === false || sound.context?.state === "running";
}

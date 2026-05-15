import Phaser from "phaser";

const POWER_UP_BLINK_ALPHA = 0.22;
const POWER_UP_BLINK_DURATION = 140;

export type GroundPowerUp = {
  sprite: Phaser.Physics.Arcade.Sprite;
  pulseTween: Phaser.Tweens.Tween;
};

type GroundPowerUpLifecycleConfig = {
  groundDuration: number;
  blinkDuration: number;
};

export class GroundPowerUpSlot<TPowerUp extends GroundPowerUp> {
  private powerUp?: TPowerUp;
  private blink?: Phaser.Tweens.Tween;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private expireTimer?: Phaser.Time.TimerEvent;
  private readonly scene: Phaser.Scene;
  private readonly config: GroundPowerUpLifecycleConfig;

  constructor(
    scene: Phaser.Scene,
    config: GroundPowerUpLifecycleConfig,
  ) {
    this.scene = scene;
    this.config = config;
  }

  isActive() {
    return Boolean(this.powerUp?.sprite.active);
  }

  matches(object: unknown) {
    return object === this.powerUp?.sprite;
  }

  spawn(powerUp: TPowerUp) {
    this.clear();
    this.powerUp = powerUp;

    this.blinkTimer = this.scene.time.delayedCall(
      this.config.groundDuration - this.config.blinkDuration,
      () => this.startBlink(),
    );
    this.expireTimer = this.scene.time.delayedCall(
      this.config.groundDuration,
      () => this.clear(),
    );
  }

  clear() {
    this.blinkTimer?.remove(false);
    this.expireTimer?.remove(false);
    this.blink?.stop();
    this.powerUp?.pulseTween.stop();
    this.powerUp?.sprite.destroy();
    this.blinkTimer = undefined;
    this.expireTimer = undefined;
    this.blink = undefined;
    this.powerUp = undefined;
  }

  private startBlink() {
    if (!this.powerUp?.sprite.active) return;

    this.blink = this.scene.tweens.add({
      targets: this.powerUp.sprite,
      alpha: POWER_UP_BLINK_ALPHA,
      duration: POWER_UP_BLINK_DURATION,
      yoyo: true,
      repeat: -1,
    });
  }
}

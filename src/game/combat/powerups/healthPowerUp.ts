import Phaser from "phaser";
import { getPowerUpSpawnPoint, type PowerUpSpawnOptions } from "./powerUpSpawn";
import type { SpawnPoint } from "../types";

const HEART_POWER_UP_FRAME = 0;
const POWER_UP_BODY_SIZE = 12;
const POWER_UP_DEPTH = 8;

export type HealthPowerUp = {
  sprite: Phaser.Physics.Arcade.Sprite;
  pulseTween: Phaser.Tweens.Tween;
};

export function createHealthPowerUp(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  point: SpawnPoint,
): HealthPowerUp {
  const powerUp = group.create(point.x, point.y, "hearts", HEART_POWER_UP_FRAME);

  if (!(powerUp instanceof Phaser.Physics.Arcade.Sprite)) {
    throw new Error("Health power-up sprite could not be created");
  }

  powerUp.setDepth(POWER_UP_DEPTH);
  powerUp.setImmovable(true);
  powerUp.body?.setSize(POWER_UP_BODY_SIZE, POWER_UP_BODY_SIZE, true);

  const pulseTween = scene.tweens.add({
    targets: powerUp,
    scale: 1.16,
    duration: 420,
    yoyo: true,
    repeat: -1,
  });

  return {
    sprite: powerUp,
    pulseTween,
  };
}

export function getHealthPowerUpSpawnPoint({
  bounds,
  player,
  enemies,
}: PowerUpSpawnOptions): SpawnPoint {
  return getPowerUpSpawnPoint({ bounds, player, enemies });
}

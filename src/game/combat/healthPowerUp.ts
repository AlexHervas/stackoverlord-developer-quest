import Phaser from "phaser";
import type { SpawnPoint } from "./types";

const HEART_POWER_UP_FRAME = 0;
const POWER_UP_BODY_SIZE = 12;
const POWER_UP_DEPTH = 8;
const SPAWN_MARGIN = 20;
const MIN_PLAYER_DISTANCE = 44;
const MIN_ENEMY_DISTANCE = 24;
const MAX_SPAWN_ATTEMPTS = 24;

type HealthPowerUpSpawnOptions = {
  bounds: Phaser.Geom.Rectangle;
  player: SpawnPoint;
  enemies: SpawnPoint[];
};

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
}: HealthPowerUpSpawnOptions): SpawnPoint {
  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt += 1) {
    const point = {
      x: Phaser.Math.Between(
        bounds.x + SPAWN_MARGIN,
        bounds.x + bounds.width - SPAWN_MARGIN,
      ),
      y: Phaser.Math.Between(
        bounds.y + SPAWN_MARGIN,
        bounds.y + bounds.height - SPAWN_MARGIN,
      ),
    };

    if (isPointSafe(point, player, enemies)) return point;
  }

  return {
    x: bounds.centerX,
    y: bounds.centerY,
  };
}

function isPointSafe(
  point: SpawnPoint,
  player: SpawnPoint,
  enemies: SpawnPoint[],
) {
  if (getDistance(point, player) < MIN_PLAYER_DISTANCE) return false;

  return enemies.every((enemy) => getDistance(point, enemy) >= MIN_ENEMY_DISTANCE);
}

function getDistance(first: SpawnPoint, second: SpawnPoint) {
  return Phaser.Math.Distance.Between(first.x, first.y, second.x, second.y);
}

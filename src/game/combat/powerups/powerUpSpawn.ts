import Phaser from "phaser";
import type { SpawnPoint } from "../types";

const SPAWN_MARGIN = 20;
const MIN_PLAYER_DISTANCE = 44;
const MIN_ENEMY_DISTANCE = 24;
const MAX_SPAWN_ATTEMPTS = 24;

export type PowerUpSpawnOptions = {
  bounds: Phaser.Geom.Rectangle;
  player: SpawnPoint;
  enemies: SpawnPoint[];
};

export function getPowerUpSpawnPoint({
  bounds,
  player,
  enemies,
}: PowerUpSpawnOptions): SpawnPoint {
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

import Phaser from "phaser";
import type { SpawnPoint } from "./types";

type ArenaBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ENEMY_SPAWN_MARGIN = 16;
const ENEMY_SPAWN_JITTER = 6;
const ENEMY_TEXTURE_KEYS = ["phantom", "spyder"] as const;

export function getEnemySpawnPoint(
  index: number,
  count: number,
  arenaBounds: ArenaBounds,
) {
  const safeCount = Math.max(count, 1);
  const perimeterDistance = (index / safeCount) * getSpawnPerimeter(arenaBounds);
  const base = getPointOnSpawnPerimeter(perimeterDistance, arenaBounds);
  return applySpawnJitter(base, arenaBounds);
}

export function getBossSpawnPoint(arenaBounds: ArenaBounds) {
  return applySpawnJitter(
    {
      x: arenaBounds.x + arenaBounds.width - ENEMY_SPAWN_MARGIN,
      y: arenaBounds.y + ENEMY_SPAWN_MARGIN,
    },
    arenaBounds,
  );
}

export function getEnemyTextureKey(index: number) {
  return ENEMY_TEXTURE_KEYS[index % ENEMY_TEXTURE_KEYS.length];
}

function getSpawnPerimeter(arenaBounds: ArenaBounds) {
  const width = getSpawnWidth(arenaBounds);
  const height = getSpawnHeight(arenaBounds);
  return width * 2 + height * 2;
}

function getPointOnSpawnPerimeter(
  distance: number,
  arenaBounds: ArenaBounds,
): SpawnPoint {
  const left = arenaBounds.x + ENEMY_SPAWN_MARGIN;
  const right = arenaBounds.x + arenaBounds.width - ENEMY_SPAWN_MARGIN;
  const top = arenaBounds.y + ENEMY_SPAWN_MARGIN;
  const bottom = arenaBounds.y + arenaBounds.height - ENEMY_SPAWN_MARGIN;
  const width = getSpawnWidth(arenaBounds);
  const height = getSpawnHeight(arenaBounds);

  if (distance < width) {
    return { x: left + distance, y: top };
  }

  if (distance < width + height) {
    return { x: right, y: top + (distance - width) };
  }

  if (distance < width * 2 + height) {
    return { x: right - (distance - width - height), y: bottom };
  }

  return { x: left, y: bottom - (distance - width * 2 - height) };
}

function applySpawnJitter(point: SpawnPoint, arenaBounds: ArenaBounds) {
  return {
    x: Phaser.Math.Clamp(
      point.x + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
      arenaBounds.x + ENEMY_SPAWN_MARGIN,
      arenaBounds.x + arenaBounds.width - ENEMY_SPAWN_MARGIN,
    ),
    y: Phaser.Math.Clamp(
      point.y + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
      arenaBounds.y + ENEMY_SPAWN_MARGIN,
      arenaBounds.y + arenaBounds.height - ENEMY_SPAWN_MARGIN,
    ),
  };
}

function getSpawnWidth(arenaBounds: ArenaBounds) {
  return arenaBounds.width - ENEMY_SPAWN_MARGIN * 2;
}

function getSpawnHeight(arenaBounds: ArenaBounds) {
  return arenaBounds.height - ENEMY_SPAWN_MARGIN * 2;
}

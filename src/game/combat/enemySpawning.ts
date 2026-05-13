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

export function getSpawnPoint(index: number, arenaBounds: ArenaBounds) {
  const positions: SpawnPoint[] = [
    {
      x: arenaBounds.x + ENEMY_SPAWN_MARGIN,
      y: arenaBounds.y + ENEMY_SPAWN_MARGIN,
    },
    {
      x: arenaBounds.x + arenaBounds.width - ENEMY_SPAWN_MARGIN,
      y: arenaBounds.y + ENEMY_SPAWN_MARGIN,
    },
    {
      x: arenaBounds.x + ENEMY_SPAWN_MARGIN,
      y: arenaBounds.y + arenaBounds.height - ENEMY_SPAWN_MARGIN,
    },
    {
      x: arenaBounds.x + arenaBounds.width - ENEMY_SPAWN_MARGIN,
      y: arenaBounds.y + arenaBounds.height - ENEMY_SPAWN_MARGIN,
    },
  ];

  const base = positions[index % positions.length];
  return {
    x: base.x + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
    y: base.y + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
  };
}

export function getEnemyTextureKey(index: number) {
  return ENEMY_TEXTURE_KEYS[index % ENEMY_TEXTURE_KEYS.length];
}

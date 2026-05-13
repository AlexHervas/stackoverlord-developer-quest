import Phaser from "phaser";
import type { Point } from "./bossLogic";

const ENEMY_HIT_TINT = 0xffb3b3;
export const ENEMY_DEFEAT_DEPTH = 4;
const ENEMY_DEFEAT_KNOCKBACK = 14;
export const ENEMY_DEFEAT_SCALE = 1.2;
export const ENEMY_DEFEAT_DURATION = 130;

export function playEnemyDefeatEffect(
  scene: Phaser.Scene,
  enemy: Phaser.Physics.Arcade.Sprite,
  playerPosition: Point,
  fallbackDirection: Phaser.Math.Vector2,
) {
  enemy.setTint(ENEMY_HIT_TINT);
  enemy.setDepth(ENEMY_DEFEAT_DEPTH);

  const knockback = new Phaser.Math.Vector2(
    enemy.x - playerPosition.x,
    enemy.y - playerPosition.y,
  );

  if (knockback.lengthSq() === 0) knockback.copy(fallbackDirection);
  knockback.normalize().scale(ENEMY_DEFEAT_KNOCKBACK);

  scene.tweens.add({
    targets: enemy,
    x: enemy.x + knockback.x,
    y: enemy.y + knockback.y,
    alpha: 0,
    scale: ENEMY_DEFEAT_SCALE,
    duration: ENEMY_DEFEAT_DURATION,
    onComplete: () => enemy.destroy(),
  });
}

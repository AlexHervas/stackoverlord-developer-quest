import Phaser from "phaser";
import { BOSS_CONFIG } from "./bossConfig";
import type { RectBounds } from "./bossUi";

export type Point = {
  x: number;
  y: number;
};

export type BossHitTransition =
  | "phase-two"
  | "phase-three"
  | "explosion"
  | "none";

type BossHitTransitionInput = {
  health: number;
  phaseTwoStarted: boolean;
  phaseThreeStarted: boolean;
};

export function isBossInAttackRange(attackCenter: Point, bossPosition: Point) {
  return (
    Phaser.Math.Distance.Between(
      attackCenter.x,
      attackCenter.y,
      bossPosition.x,
      bossPosition.y,
    ) <= BOSS_CONFIG.hurtRadius
  );
}

export function isBossContactDamagingPlayer(
  playerPosition: Point,
  bossPosition: Point,
) {
  return (
    Phaser.Math.Distance.Between(
      playerPosition.x,
      playerPosition.y,
      bossPosition.x,
      bossPosition.y,
    ) <= BOSS_CONFIG.contactDamageRadius
  );
}

export function getBossPlayerSeparationVector(
  playerPosition: Point,
  bossPosition: Point,
  minimumDistance = BOSS_CONFIG.contactDamageRadius,
) {
  const offset = new Phaser.Math.Vector2(
    playerPosition.x - bossPosition.x,
    playerPosition.y - bossPosition.y,
  );
  const distance = offset.length();
  if (distance >= minimumDistance) return new Phaser.Math.Vector2(0, 0);

  if (distance === 0) {
    offset.set(1, 0);
  } else {
    offset.scale(1 / distance);
  }

  return offset.scale(minimumDistance - distance);
}

export function getBossHitTransition({
  health,
  phaseTwoStarted,
  phaseThreeStarted,
}: BossHitTransitionInput): BossHitTransition {
  if (!phaseTwoStarted && health <= BOSS_CONFIG.phaseTwoHealth) {
    return "phase-two";
  }

  if (!phaseThreeStarted && health <= BOSS_CONFIG.phaseThreeHealth) {
    return "phase-three";
  }

  if (phaseThreeStarted) {
    return "explosion";
  }

  return "none";
}

export function getBossExplosionDangerBounds(arenaBounds: RectBounds) {
  return {
    x: arenaBounds.x + BOSS_CONFIG.explosionEdgeSafeMargin,
    y: arenaBounds.y + BOSS_CONFIG.explosionEdgeSafeMargin,
    width: arenaBounds.width - BOSS_CONFIG.explosionEdgeSafeMargin * 2,
    height: arenaBounds.height - BOSS_CONFIG.explosionEdgeSafeMargin * 2,
  };
}

export function isPointInsideBounds(point: Point, bounds: RectBounds) {
  return Phaser.Geom.Rectangle.Contains(
    new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
    point.x,
    point.y,
  );
}

export function getBossKnockbackVector(
  bossPosition: Point,
  playerPosition: Point,
  fallbackDirection: Phaser.Math.Vector2,
) {
  const knockback = new Phaser.Math.Vector2(
    bossPosition.x - playerPosition.x,
    bossPosition.y - playerPosition.y,
  );

  if (knockback.lengthSq() === 0) knockback.copy(fallbackDirection);
  return knockback.normalize().scale(BOSS_CONFIG.hitKnockback);
}

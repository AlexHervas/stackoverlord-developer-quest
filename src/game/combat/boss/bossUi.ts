import Phaser from "phaser";
import { BOSS_CONFIG } from "./bossConfig";

export type RectBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BossHud = {
  labelText: Phaser.GameObjects.Text;
  healthBar: Phaser.GameObjects.Graphics;
};

export type BossInvulnerabilityFeedback = {
  aura: Phaser.GameObjects.Graphics;
  blink: Phaser.Tweens.Tween;
};

export class BossVisuals {
  private hud?: BossHud;
  private explosionWarning?: Phaser.GameObjects.Graphics;
  private invulnerableAura?: Phaser.GameObjects.Graphics;
  private invulnerableBlink?: Phaser.Tweens.Tween;
  private readonly scene: Phaser.Scene;
  private readonly arenaWidth: number;
  private readonly arenaBounds: RectBounds;

  constructor(scene: Phaser.Scene, arenaWidth: number, arenaBounds: RectBounds) {
    this.scene = scene;
    this.arenaWidth = arenaWidth;
    this.arenaBounds = arenaBounds;
  }

  drawHealthBar(health: number, position: { x: number; y: number }) {
    this.hud ??= createBossHud(this.scene, this.arenaWidth);
    drawBossHealthBar(this.hud, health, position);
  }

  clearHealthBar() {
    clearBossHud(this.hud);
  }

  setHudVisible(isVisible: boolean) {
    setBossHudVisible(this.hud, isVisible);
  }

  getExplosionWarning() {
    this.explosionWarning ??= createBossExplosionWarning(this.scene);
    return this.explosionWarning;
  }

  drawExplosionWarning(danger: RectBounds, alpha: number) {
    drawBossExplosionWarning(
      this.getExplosionWarning(),
      danger,
      this.arenaBounds,
      alpha,
    );
  }

  clearExplosionWarning() {
    clearBossExplosionWarning(this.explosionWarning);
  }

  startInvulnerabilityFeedback(boss: Phaser.Physics.Arcade.Sprite) {
    const feedback = startBossInvulnerabilityFeedback(
      this.scene,
      boss,
      this.invulnerableAura,
      this.invulnerableBlink,
    );
    this.invulnerableAura = feedback.aura;
    this.invulnerableBlink = feedback.blink;
  }

  updateInvulnerabilityAuraPosition(
    boss: Phaser.Physics.Arcade.Sprite | undefined,
  ) {
    updateBossInvulnerabilityAuraPosition(this.invulnerableAura, boss);
  }

  stopInvulnerabilityFeedback(boss: Phaser.Physics.Arcade.Sprite | undefined) {
    stopBossInvulnerabilityFeedback(
      {
        aura: this.invulnerableAura,
        blink: this.invulnerableBlink,
      },
      boss,
    );
    this.invulnerableBlink = undefined;
  }
}

export function createBossHud(
  scene: Phaser.Scene,
  arenaWidth: number,
): BossHud {
  const labelText = scene.add
    .text(arenaWidth / 2, BOSS_CONFIG.labelY, "BOSS", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffb3b3",
      backgroundColor: "rgba(0,0,0,0.62)",
      padding: { x: 5, y: 1 },
    })
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(30);

  const healthBar = scene.add.graphics().setScrollFactor(0).setDepth(30);

  return { labelText, healthBar };
}

export function drawBossHealthBar(
  hud: BossHud,
  health: number,
  position: { x: number; y: number },
) {
  const fillWidth = Math.max(
    0,
    Math.round((health / BOSS_CONFIG.health) * BOSS_CONFIG.barWidth),
  );

  hud.labelText.setVisible(true);
  hud.healthBar.setVisible(true);
  hud.healthBar.clear();
  hud.healthBar.fillStyle(0x000000, 0.68);
  hud.healthBar.fillRect(
    position.x - 2,
    position.y - 2,
    BOSS_CONFIG.barWidth + 4,
    BOSS_CONFIG.barHeight + 4,
  );
  hud.healthBar.fillStyle(0x5b1f1f, 1);
  hud.healthBar.fillRect(
    position.x,
    position.y,
    BOSS_CONFIG.barWidth,
    BOSS_CONFIG.barHeight,
  );
  hud.healthBar.fillStyle(0xff4d4d, 1);
  hud.healthBar.fillRect(
    position.x,
    position.y,
    fillWidth,
    BOSS_CONFIG.barHeight,
  );
}

export function setBossHudVisible(hud: BossHud | undefined, isVisible: boolean) {
  hud?.healthBar.setVisible(isVisible);
  hud?.labelText.setVisible(isVisible);
}

export function clearBossHud(hud: BossHud | undefined) {
  hud?.healthBar.clear();
  setBossHudVisible(hud, false);
}

export function createBossExplosionWarning(scene: Phaser.Scene) {
  return scene.add.graphics().setDepth(6).setScrollFactor(0).setVisible(false);
}

export function drawBossExplosionWarning(
  warning: Phaser.GameObjects.Graphics,
  danger: RectBounds,
  arena: RectBounds,
  alpha: number,
) {
  warning.setVisible(true);
  warning.clear();
  warning.fillStyle(BOSS_CONFIG.explosionDangerColor, alpha);
  warning.fillRect(danger.x, danger.y, danger.width, danger.height);
  warning.lineStyle(2, BOSS_CONFIG.explosionDangerColor, 0.95);
  warning.strokeRect(danger.x, danger.y, danger.width, danger.height);
  warning.lineStyle(1, BOSS_CONFIG.explosionSafeColor, 0.8);
  warning.strokeRect(
    arena.x + BOSS_CONFIG.explosionSafeOutlineXInset,
    arena.y + BOSS_CONFIG.explosionSafeOutlineYOffset,
    arena.width - BOSS_CONFIG.explosionSafeOutlineXInset * 2,
    arena.height + BOSS_CONFIG.explosionSafeOutlineHeightExtra,
  );
}

export function clearBossExplosionWarning(
  warning: Phaser.GameObjects.Graphics | undefined,
) {
  warning?.clear();
  warning?.setAlpha(1);
  warning?.setVisible(false);
}

export function startBossInvulnerabilityFeedback(
  scene: Phaser.Scene,
  boss: Phaser.Physics.Arcade.Sprite,
  existingAura?: Phaser.GameObjects.Graphics,
  existingBlink?: Phaser.Tweens.Tween,
): BossInvulnerabilityFeedback {
  const aura =
    existingAura ?? scene.add.graphics().setDepth(7).setVisible(false);
  aura.setVisible(true);
  aura.clear();
  aura.lineStyle(
    3,
    BOSS_CONFIG.invulnerableAuraColor,
    BOSS_CONFIG.invulnerableAuraAlpha,
  );
  aura.strokeCircle(0, 0, BOSS_CONFIG.invulnerableAuraRadius);
  aura.lineStyle(1, 0xffffff, 0.72);
  aura.strokeCircle(0, 0, BOSS_CONFIG.invulnerableAuraRadius + 3);
  updateBossInvulnerabilityAuraPosition(aura, boss);

  existingBlink?.stop();
  const blink = scene.tweens.add({
    targets: boss,
    alpha: BOSS_CONFIG.invulnerableBlinkAlpha,
    duration: BOSS_CONFIG.invulnerableBlinkDuration,
    yoyo: true,
    repeat: -1,
  });

  return { aura, blink };
}

export function updateBossInvulnerabilityAuraPosition(
  aura: Phaser.GameObjects.Graphics | undefined,
  boss: Phaser.Physics.Arcade.Sprite | undefined,
) {
  if (!aura || !boss?.active) return;
  aura.setPosition(boss.x, boss.y);
}

export function stopBossInvulnerabilityFeedback(
  feedback: {
    aura?: Phaser.GameObjects.Graphics;
    blink?: Phaser.Tweens.Tween;
  },
  boss: Phaser.Physics.Arcade.Sprite | undefined,
) {
  feedback.blink?.stop();
  if (boss?.active) boss.setAlpha(1);
  feedback.aura?.clear();
  feedback.aura?.setVisible(false);
}

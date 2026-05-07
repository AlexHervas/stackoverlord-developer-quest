import Phaser from "phaser";
import {
  createHudTexts,
  createOverlayTexts,
  createStaticTexts,
} from "./combat/hud";
import {
  formatRankingRows,
  getBestScore,
  getPlayerId,
  hasBestScore,
  loadRanking,
  saveBestScore,
  saveRankingEntry,
} from "./combat/ranking";
import type { RankingEntry, SpawnPoint } from "./combat/types";

const ARENA_WIDTH = 320;
const ARENA_HEIGHT = 160;
const SPEED = 95;
const ENEMY_SPEED = 34;
const ATTACK_RANGE = 34;
const ATTACK_COOLDOWN = 320;
const DAMAGE_COOLDOWN = 900;
const MAX_NAME_LENGTH = 10;
const UI_FONT = "11px";
const TITLE_FONT = "12px";
const INITIAL_ROUND = 1;
const INITIAL_HEALTH = 3;
const PLAYER_START_Y_OFFSET = 18;
const ENEMY_SPAWN_MARGIN = 16;
const ENEMY_SPAWN_JITTER = 6;
const ENEMY_SPEED_PER_ROUND = 3;
const ENEMY_HIT_TINT = 0xffb3b3;
const ENEMY_TEXTURE_KEYS = ["phantom", "spyder"] as const;
const ATTACK_CENTER_OFFSET = 14;
const ATTACK_HIT_PADDING = 8;
const SLASH_DEPTH = 5;
const SLASH_FADE_SCALE = 1.08;
const SLASH_FADE_DURATION = 150;
const SLASH_OFFSET = 6;
const SLASH_START_ANGLE = -Math.PI / 3.2;
const SLASH_END_ANGLE = Math.PI / 3.2;
const SLASH_RADIUS = 16;
const SLASH_OUTER_RADIUS = 19;
const SLASH_STEPS = 6;
const SLASH_STEP_DELAY = 18;
const SLASH_SHADOW_WIDTH = 4;
const SLASH_SHADOW_COLOR = 0xffe7a2;
const SLASH_SHADOW_ALPHA = 0.34;
const SLASH_CORE_WIDTH = 2;
const SLASH_CORE_COLOR = 0xffffff;
const SLASH_CORE_ALPHA = 0.82;
const PLAYER_HIT_SHAKE_DURATION = 90;
const PLAYER_HIT_SHAKE_INTENSITY = 0.008;
const PLAYER_HIT_TINT = 0xff6b6b;
const PLAYER_HIT_BLINK_ALPHA = 0.35;
const PLAYER_HIT_BLINK_DURATION = 80;
const PLAYER_HIT_BLINK_REPEATS = 5;
const ENEMY_DEFEAT_DEPTH = 4;
const ENEMY_DEFEAT_KNOCKBACK = 14;
const ENEMY_DEFEAT_SCALE = 1.2;
const ENEMY_DEFEAT_DURATION = 130;
const ROUND_START_DELAY = 900;
const KILL_SCORE = 100;
const ROUND_SCORE = 250;
const SECOND_SCORE = 5;
const ARENA_BOUNDS = {
  x: 12,
  y: 24,
  width: ARENA_WIDTH - 24,
  height: ARENA_HEIGHT - 36,
};
const HUD_CONFIG = {
  arenaWidth: ARENA_WIDTH,
  arenaHeight: ARENA_HEIGHT,
  titleFont: TITLE_FONT,
  uiFont: UI_FONT,
};

export default class CombatScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private retryKey!: Phaser.Input.Keyboard.Key;

  private round = INITIAL_ROUND;
  private health = INITIAL_HEALTH;
  private lastAttackAt = 0;
  private lastDamageAt = 0;
  private isChangingRound = false;
  private isGameOver = false;
  private isEnteringName = false;
  private kills = 0;
  private activeStartedAt = 0;
  private activeElapsedMs = 0;
  private finalScore = 0;
  private finalSeconds = 0;
  private nameDraft = "";
  private facing = new Phaser.Math.Vector2(1, 0);

  private roundText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private rankingText!: Phaser.GameObjects.Text;
  private nameInputText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  constructor() {
    super("CombatScene");
  }

  preload() {
    this.load.image("combatTiles", "assets/tilemap.png");
    this.load.tilemapTiledJSON("combatArena", "assets/combatArena.json");
    this.load.image("playerSprite", "assets/player.png");
    this.load.image("phantom", "assets/phantom.png");
    this.load.image("spyder", "assets/spyder.png");
  }

  create() {
    this.resetCombatState();
    this.setupWorldBounds();
    this.setupCamera();
    const wallsLayer = this.createArenaMap();

    createStaticTexts(this, HUD_CONFIG);
    this.createPlayerAndEnemies(wallsLayer);
    this.setupInput();
    this.setupHudTexts();
    this.setupOverlayTexts();
    this.setupLifecycleListeners();

    this.startRound();
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (!this.player || !this.cursors) return;

    if (this.handleGameOverInput()) return;

    this.updatePlayerMovement(this.cursors);
    this.updateEnemies();

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.attack();
    }

    this.updateHud();
    this.checkRoundComplete();

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.returnToHub();
    }
  }

  private updatePlayerMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  ) {
    let vx = 0;
    let vy = 0;

    if (cursors.left?.isDown) {
      vx = -1;
      this.player.setFlipX(true);
    } else if (cursors.right?.isDown) {
      vx = 1;
      this.player.setFlipX(false);
    }

    if (cursors.up?.isDown) vy = -1;
    else if (cursors.down?.isDown) vy = 1;

    if (vx !== 0 || vy !== 0) {
      this.facing.set(vx, vy).normalize();
    }

    this.player.setAngle(vx === 0 ? 0 : vx < 0 ? -3 : 3);

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);
  }

  private handleGameOverInput() {
    if (!this.isGameOver) return false;

    this.player.setVelocity(0, 0);
    if (
      !this.isEnteringName &&
      Phaser.Input.Keyboard.JustDown(this.retryKey)
    ) {
      this.scene.restart();
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.returnToHub();
    return true;
  }

  private resetCombatState() {
    this.round = INITIAL_ROUND;
    this.health = INITIAL_HEALTH;
    this.lastAttackAt = 0;
    this.lastDamageAt = 0;
    this.isChangingRound = false;
    this.isGameOver = false;
    this.isEnteringName = false;
    this.kills = 0;
    this.activeStartedAt = Date.now();
    this.activeElapsedMs = 0;
    this.finalScore = 0;
    this.finalSeconds = 0;
    this.nameDraft = "";
    this.facing.set(1, 0);
  }

  private setupWorldBounds() {
    this.physics.world.setBounds(
      ARENA_BOUNDS.x,
      ARENA_BOUNDS.y,
      ARENA_BOUNDS.width,
      ARENA_BOUNDS.height,
    );
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    cam.roundPixels = true;
    cam.centerOn(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
  }

  private createArenaMap() {
    const map = this.make.tilemap({ key: "combatArena" });
    const tileset = map.addTilesetImage("combat_tiles", "combatTiles");
    if (!tileset) throw new Error("Arena tileset not found");

    const groundLayer = map.createLayer("Ground", tileset);
    const wallsLayer = map.createLayer("Walls", tileset);
    const decorationLayer = map.createLayer("Decoration", tileset);
    if (!groundLayer || !wallsLayer || !decorationLayer) {
      throw new Error("Missing layers in combatArena.json");
    }

    wallsLayer.setCollisionByProperty({ collides: true });

    return wallsLayer;
  }

  private createPlayerAndEnemies(wallsLayer: Phaser.Tilemaps.TilemapLayer) {
    this.player = this.physics.add
      .sprite(
        ARENA_WIDTH / 2,
        ARENA_HEIGHT / 2 + PLAYER_START_Y_OFFSET,
        "playerSprite",
      )
      .setScale(1);
    this.player.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.enemies, wallsLayer);
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      undefined,
      this,
    );
  }

  private setupInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    this.attackKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.retryKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }

  private setupLifecycleListeners() {
    this.input.keyboard?.on("keydown", this.handleNameInput, this);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleNameInput, this);
      window.removeEventListener("blur", this.handleWindowBlur);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    });
  }

  private setupHudTexts() {
    const hudTexts = createHudTexts(this, HUD_CONFIG);
    this.roundText = hudTexts.roundText;
    this.healthText = hudTexts.healthText;
    this.enemiesText = hudTexts.enemiesText;
    this.scoreText = hudTexts.scoreText;
  }

  private setupOverlayTexts() {
    const overlayTexts = createOverlayTexts(this, HUD_CONFIG);
    this.messageText = overlayTexts.messageText;
    this.rankingText = overlayTexts.rankingText;
    this.nameInputText = overlayTexts.nameInputText;
    this.controlsText = overlayTexts.controlsText;
  }

  private startRound() {
    this.isChangingRound = false;
    this.messageText.setVisible(false);
    this.spawnEnemies(this.round + 1);
    this.updateHud();
  }

  private spawnEnemies(count: number) {
    for (let i = 0; i < count; i += 1) {
      const point = this.getSpawnPoint(i);
      const enemy = this.enemies.create(
        point.x,
        point.y,
        this.getEnemyTextureKey(i),
      ) as Phaser.Physics.Arcade.Sprite;

      enemy.setCollideWorldBounds(true);
      enemy.setScale(1);
    }
  }

  private getSpawnPoint(index: number): SpawnPoint {
    const positions = [
      {
        x: ARENA_BOUNDS.x + ENEMY_SPAWN_MARGIN,
        y: ARENA_BOUNDS.y + ENEMY_SPAWN_MARGIN,
      },
      {
        x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - ENEMY_SPAWN_MARGIN,
        y: ARENA_BOUNDS.y + ENEMY_SPAWN_MARGIN,
      },
      {
        x: ARENA_BOUNDS.x + ENEMY_SPAWN_MARGIN,
        y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - ENEMY_SPAWN_MARGIN,
      },
      {
        x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - ENEMY_SPAWN_MARGIN,
        y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - ENEMY_SPAWN_MARGIN,
      },
    ];

    const base = positions[index % positions.length];
    return {
      x:
        base.x +
        Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
      y:
        base.y +
        Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
    };
  }

  private getEnemyTextureKey(index: number) {
    return ENEMY_TEXTURE_KEYS[index % ENEMY_TEXTURE_KEYS.length];
  }

  private updateEnemies() {
    this.getActiveEnemies().forEach((enemy) => {
      this.physics.moveToObject(
        enemy,
        this.player,
        ENEMY_SPEED + this.round * ENEMY_SPEED_PER_ROUND,
      );
      enemy.setFlipX(enemy.body!.velocity.x < 0);
    });
  }

  private attack() {
    if (this.time.now - this.lastAttackAt < ATTACK_COOLDOWN) return;

    this.lastAttackAt = this.time.now;
    const attackCenter = this.getAttackCenter();
    const slash = this.createSlashEffect(this.player.x, this.player.y);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: SLASH_FADE_SCALE,
      duration: SLASH_FADE_DURATION,
      onComplete: () => slash.destroy(),
    });

    this.getActiveEnemies().forEach((enemy) => {
      const distance = Phaser.Math.Distance.Between(
        attackCenter.x,
        attackCenter.y,
        enemy.x,
        enemy.y,
      );

      if (distance <= ATTACK_RANGE / 2 + ATTACK_HIT_PADDING) {
        this.defeatEnemy(enemy);
      }
    });

    this.updateHud();
  }

  private handlePlayerHit = () => {
    if (this.isGameOver) return;
    if (this.time.now - this.lastDamageAt < DAMAGE_COOLDOWN) return;

    this.lastDamageAt = this.time.now;
    this.health -= 1;
    this.cameras.main.shake(
      PLAYER_HIT_SHAKE_DURATION,
      PLAYER_HIT_SHAKE_INTENSITY,
    );
    this.startPlayerInvulnerabilityFeedback();

    if (this.health <= 0) {
      this.endGame();
    }

    this.updateHud();
  };

  private getAttackCenter() {
    return {
      x: this.player.x + this.facing.x * ATTACK_CENTER_OFFSET,
      y: this.player.y + this.facing.y * ATTACK_CENTER_OFFSET,
    };
  }

  private createSlashEffect(x: number, y: number) {
    const slash = this.add.container(x, y).setDepth(SLASH_DEPTH);
    const arc = this.add.graphics();
    const angle = Math.atan2(this.facing.y, this.facing.x);

    arc.x = this.facing.x * SLASH_OFFSET;
    arc.y = this.facing.y * SLASH_OFFSET;
    arc.rotation = angle;
    slash.add(arc);

    for (let step = 1; step <= SLASH_STEPS; step += 1) {
      this.time.delayedCall((step - 1) * SLASH_STEP_DELAY, () => {
        if (!arc.active) return;

        const progress = step / SLASH_STEPS;
        const currentEnd = Phaser.Math.Linear(
          SLASH_START_ANGLE,
          SLASH_END_ANGLE,
          progress,
        );
        arc.clear();

        arc.lineStyle(
          SLASH_SHADOW_WIDTH,
          SLASH_SHADOW_COLOR,
          SLASH_SHADOW_ALPHA,
        );
        arc.beginPath();
        arc.arc(0, 0, SLASH_RADIUS, SLASH_START_ANGLE, currentEnd);
        arc.strokePath();

        arc.lineStyle(SLASH_CORE_WIDTH, SLASH_CORE_COLOR, SLASH_CORE_ALPHA);
        arc.beginPath();
        arc.arc(0, 0, SLASH_OUTER_RADIUS, SLASH_START_ANGLE, currentEnd);
        arc.strokePath();
      });
    }

    return slash;
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!enemy.active) return;

    this.kills += 1;
    enemy.disableBody(false, false);
    enemy.setTint(ENEMY_HIT_TINT);
    enemy.setDepth(ENEMY_DEFEAT_DEPTH);

    const knockback = new Phaser.Math.Vector2(
      enemy.x - this.player.x,
      enemy.y - this.player.y,
    );

    if (knockback.lengthSq() === 0) knockback.copy(this.facing);
    knockback.normalize().scale(ENEMY_DEFEAT_KNOCKBACK);

    this.tweens.add({
      targets: enemy,
      x: enemy.x + knockback.x,
      y: enemy.y + knockback.y,
      alpha: 0,
      scale: ENEMY_DEFEAT_SCALE,
      duration: ENEMY_DEFEAT_DURATION,
      onComplete: () => enemy.destroy(),
    });
  }

  private startPlayerInvulnerabilityFeedback() {
    this.player.setTint(PLAYER_HIT_TINT);

    this.tweens.add({
      targets: this.player,
      alpha: PLAYER_HIT_BLINK_ALPHA,
      duration: PLAYER_HIT_BLINK_DURATION,
      yoyo: true,
      repeat: PLAYER_HIT_BLINK_REPEATS,
      onComplete: () => {
        if (!this.player.active) return;
        this.player.setAlpha(1);
        this.player.clearTint();
      },
    });
  }

  private checkRoundComplete() {
    if (this.isChangingRound || this.enemies.countActive(true) > 0) return;

    this.isChangingRound = true;
    this.round += 1;
    this.messageText.setText(`ROUND ${this.round}`).setVisible(true);

    this.time.delayedCall(ROUND_START_DELAY, () => {
      if (!this.isGameOver) this.startRound();
    });
  }

  private endGame() {
    this.finalSeconds = this.getSurvivedSeconds();
    this.finalScore = this.calculateScore();
    this.isGameOver = true;
    this.health = 0;
    this.player.setVisible(false);
    this.player.disableBody(false, false);
    this.getActiveEnemies().forEach((enemy) => {
      enemy.setVelocity(0, 0);
      enemy.disableBody(true, true);
    });

    const bestScore = getBestScore();

    if (!hasBestScore() || this.finalScore > bestScore) {
      this.isEnteringName = true;
      this.messageText
        .setText(`NEW RECORD: ${this.finalScore}`)
        .setVisible(true);
      this.showRanking("TYPE NAME + ENTER");
      this.updateNameInput();
    } else {
      this.messageText
        .setText(`YOU FELL. SCORE: ${this.finalScore}`)
        .setVisible(true);
      this.showRanking("E: RETRY | ESC: HUB");
    }
  }

  private updateHud() {
    this.roundText.setText(`ROUND: ${this.round}`);
    this.healthText.setText(`HEALTH: ${this.health}`);
    this.enemiesText.setText(`ENEMIES: ${this.enemies.countActive(true)}`);
    this.scoreText.setText(`SCORE: ${this.calculateScore()}`);
  }

  private getActiveEnemies() {
    return this.enemies
      .getChildren()
      .filter((enemy): enemy is Phaser.Physics.Arcade.Sprite => {
        return enemy instanceof Phaser.Physics.Arcade.Sprite && enemy.active;
      });
  }

  private returnToHub() {
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start("HubScene", { spawn: "arena" });
      },
    );
  }

  private calculateScore() {
    return (
      this.kills * KILL_SCORE +
      this.round * ROUND_SCORE +
      this.getSurvivedSeconds() * SECOND_SCORE
    );
  }

  private getSurvivedSeconds() {
    if (this.isGameOver) return this.finalSeconds;
    return Math.floor(this.getActiveElapsedMs() / 1000);
  }

  private getActiveElapsedMs() {
    if (this.isGameOver) return this.finalSeconds * 1000;
    if (this.scene.isPaused()) return this.activeElapsedMs;
    return this.activeElapsedMs + Date.now() - this.activeStartedAt;
  }

  private pauseCombatTimer() {
    if (this.isGameOver || this.scene.isPaused()) return;

    this.activeElapsedMs += Date.now() - this.activeStartedAt;
    this.player?.setVelocity(0, 0);
    this.getActiveEnemies().forEach((enemy) => enemy.setVelocity(0, 0));
    this.scene.pause();
  }

  private resumeCombatTimer() {
    if (this.isGameOver || !this.scene.isPaused()) return;

    this.activeStartedAt = Date.now();
    this.scene.resume();
  }

  private handleWindowBlur = () => {
    this.pauseCombatTimer();
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.pauseCombatTimer();
    } else {
      this.resumeCombatTimer();
    }
  };

  private handleNameInput(event: KeyboardEvent) {
    if (!this.isEnteringName) return;

    if (event.key === "Enter") {
      this.saveRecord();
      return;
    }

    if (event.key === "Backspace") {
      this.nameDraft = this.nameDraft.slice(0, -1);
      this.updateNameInput();
      return;
    }

    if (event.key.length !== 1 || this.nameDraft.length >= MAX_NAME_LENGTH) {
      return;
    }

    if (/^[a-zA-Z0-9 _-]$/.test(event.key)) {
      this.nameDraft += event.key.toUpperCase();
      this.updateNameInput();
    }
  }

  private updateNameInput() {
    const visibleName = this.nameDraft.padEnd(MAX_NAME_LENGTH, "_");
    this.nameInputText.setText(`NAME: ${visibleName}`).setVisible(true);
    this.controlsText.setText("ENTER: SAVE | ESC: HUB").setVisible(true);
  }

  private saveRecord() {
    const entry: RankingEntry = {
      playerId: getPlayerId(),
      name: this.nameDraft.trim() || "ANON",
      score: this.finalScore,
      round: this.round,
      kills: this.kills,
      seconds: this.finalSeconds,
      date: new Date().toISOString(),
    };

    saveRankingEntry(entry);
    saveBestScore(this.finalScore);

    this.isEnteringName = false;
    this.nameInputText.setVisible(false);
    this.messageText.setText(`SAVED: ${entry.name} ${entry.score}`);
    this.showRanking("E: RETRY | ESC: HUB");
  }

  private showRanking(footer: string) {
    const ranking = loadRanking();
    const rows = formatRankingRows(ranking);

    this.rankingText
      .setText([
        "TOP 10 ARENA",
        ...rows,
        "",
        `KILLS: ${this.kills}  ROUND: ${this.round}  TIME: ${this.finalSeconds}S`,
      ])
      .setVisible(true);
    this.controlsText.setText(footer).setVisible(true);
  }

}

import Phaser from "phaser";
import {
  createHudTexts,
  createOverlayTexts,
  createStaticTexts,
  updateHealthHearts,
} from "./combat/ui/hud";
import { getAttackHubHint, getManualAttackHubHint } from "./input/inputMode";
import { virtualInput } from "./input/virtualInput";
import { createMusicControl } from "./ui/musicControl";
import {
  createAttackModeSelection,
  type AttackMode,
  type CombatSceneData,
} from "./combat/ui/attackMode";
import {
  CombatGameOverFlow,
  type CombatGameOverStats,
} from "./combat/ui/gameOverFlow";
import { CombatScoreTracker } from "./combat/score/combatScore";
import {
  getBossSpawnPoint,
  getEnemySpawnPoint,
  getEnemyTextureKey,
} from "./combat/enemySpawning";
import {
  createHealthPowerUp,
  getHealthPowerUpSpawnPoint,
  type HealthPowerUp,
} from "./combat/powerups/healthPowerUp";
import {
  createInvulnerabilityPowerUp,
  getInvulnerabilityPowerUpSpawnPoint,
  type InvulnerabilityPowerUp,
} from "./combat/powerups/invulnerabilityPowerUp";
import { PlayerPowerUpInvulnerability } from "./combat/powerups/playerPowerUpInvulnerability";
import { GroundPowerUpSlot } from "./combat/powerups/powerUpLifecycle";
import {
  ENEMY_DEFEAT_DEPTH,
  ENEMY_DEFEAT_DURATION,
  ENEMY_DEFEAT_SCALE,
  playEnemyDefeatEffect,
} from "./combat/ui/enemyUi";
import {
  createSlashEffect,
  SLASH_FADE_DURATION,
  SLASH_FADE_SCALE,
} from "./combat/ui/playerAttackUi";
import { BOSS_CONFIG, type BossActionState } from "./combat/boss/bossConfig";
import {
  getBossExplosionDangerBounds,
  getBossHitTransition,
  getBossKnockbackVector,
  getBossPlayerSeparationVector,
  isBossContactDamagingPlayer,
  isBossInAttackRange,
  isPointInsideBounds,
} from "./combat/boss/bossLogic";
import {
  BossVisuals,
} from "./combat/boss/bossUi";
import {
  ARENA_BOUNDS,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ATTACK_CENTER_OFFSET,
  ATTACK_COOLDOWN,
  ATTACK_HIT_PADDING,
  ATTACK_RANGE,
  BOSS_BAR_X,
  BOSS_BAR_Y,
  BOSS_CENTER_X,
  BOSS_CENTER_Y,
  BOSS_INVULNERABILITY_POWER_UP_ATTEMPT_INTERVAL,
  BOSS_INVULNERABILITY_POWER_UP_DROP_CHANCE,
  COMBAT_AUDIO,
  DAMAGE_COOLDOWN,
  ENEMY_SPEED,
  ENEMY_SPEED_PER_ROUND,
  HEALTH_POWER_UP_DROP_CHANCE,
  HEALTH_POWER_UP_HEAL,
  HUD_CONFIG,
  INITIAL_HEALTH,
  INITIAL_ROUND,
  INVULNERABILITY_POWER_UP_BLINK_DURATION,
  INVULNERABILITY_POWER_UP_DROP_CHANCE,
  INVULNERABILITY_POWER_UP_DURATION,
  INVULNERABILITY_POWER_UP_MIN_ROUND,
  MAX_NAME_LENGTH,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HIT_BLINK_ALPHA,
  PLAYER_HIT_BLINK_DURATION,
  PLAYER_HIT_BLINK_REPEATS,
  PLAYER_HIT_SHAKE_DURATION,
  PLAYER_HIT_SHAKE_INTENSITY,
  PLAYER_HIT_TINT,
  PLAYER_START_Y_OFFSET,
  POWER_UP_GROUND_BLINK_DURATION,
  POWER_UP_GROUND_DURATION,
  ROUND_START_DELAY,
  SCORE_CONFIG,
  SPEED,
  TITLE_FONT,
} from "./combat/combatSceneConfig";

type ArcadeOverlapObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export default class CombatScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private healthPowerUps!: Phaser.Physics.Arcade.Group;
  private invulnerabilityPowerUps!: Phaser.Physics.Arcade.Group;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private boss?: Phaser.Physics.Arcade.Sprite;
  private bossHealth = 0;
  private bossStunnedUntil = 0;
  private bossPhaseTwoStarted = false;
  private bossPhaseThreeStarted = false;
  private bossInvulnerable = false;
  private bossActionState: BossActionState = "chase";
  private bossActionUntil = 0;
  private nextBossChargeAt = 0;
  private bossChargeDirection = new Phaser.Math.Vector2(0, 0);
  private bossVisuals?: BossVisuals;
  private healthPowerUpSlot?: GroundPowerUpSlot<HealthPowerUp>;
  private invulnerabilityPowerUpSlot?: GroundPowerUpSlot<InvulnerabilityPowerUp>;
  private bossInvulnerabilityPowerUpTimer?: Phaser.Time.TimerEvent;
  private playerPowerUpInvulnerability?: PlayerPowerUpInvulnerability;
  private playerHitFeedbackTween?: Phaser.Tweens.Tween;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey!: Phaser.Input.Keyboard.Key;
  private retryKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;

  private attackMode: AttackMode = "auto";
  private selectedAttackMode?: AttackMode;
  private shouldReuseAttackModeOnRetry = false;
  private isChoosingAttackMode = false;
  private attackModeOverlay?: Phaser.GameObjects.Container;
  private round = INITIAL_ROUND;
  private health = INITIAL_HEALTH;
  private lastAttackAt = 0;
  private lastDamageAt = 0;
  private isChangingRound = false;
  private isGameOver = false;
  private kills = 0;
  private scoreTracker = new CombatScoreTracker(SCORE_CONFIG);
  private finalScore = 0;
  private finalSeconds = 0;
  private facing = new Phaser.Math.Vector2(1, 0);

  private roundText!: Phaser.GameObjects.Text;
  private healthHearts: Phaser.GameObjects.Image[] = [];
  private enemiesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private attackHintText!: Phaser.GameObjects.Text;
  private musicControl?: ReturnType<typeof createMusicControl>;
  private gameOverFlow?: CombatGameOverFlow;
  private isPauseMenuOpen = false;

  constructor() {
    super("CombatScene");
  }

  init(data: CombatSceneData = {}) {
    this.selectedAttackMode = data.forceAttackModeSelection
      ? undefined
      : data.attackMode;
    this.shouldReuseAttackModeOnRetry = Boolean(
      !data.forceAttackModeSelection && data.attackMode,
    );
  }

  preload() {
    this.load.image("combatTiles", "assets/tilemap.png");
    this.load.tilemapTiledJSON("combatArena", "assets/combatArena.json");
    this.load.image("playerSprite", "assets/player.png");
    this.load.spritesheet("hearts", "assets/hearts.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("shieldPowerUp", "assets/shield.png");
    this.load.image("phantom", "assets/phantom.png");
    this.load.image("spyder", "assets/spyder.png");
    this.load.spritesheet(BOSS_CONFIG.textureKey, "assets/orc.png", {
      frameWidth: BOSS_CONFIG.frameWidth,
      frameHeight: BOSS_CONFIG.frameHeight,
    });
    this.load.audio(COMBAT_AUDIO.music.key, COMBAT_AUDIO.music.paths);
    this.load.audio(COMBAT_AUDIO.attack.key, COMBAT_AUDIO.attack.paths);
    this.load.audio(COMBAT_AUDIO.playerHit.key, COMBAT_AUDIO.playerHit.paths);
  }

  create() {
    virtualInput.clearActions();
    this.resetCombatState();
    this.setupWorldBounds();
    this.setupCamera();
    const wallsLayer = this.createArenaMap();

    this.setupStaticTexts();
    this.createPlayerAndEnemies(wallsLayer);
    this.setupInput();
    this.setupHudTexts();
    this.setupOverlayTexts();
    this.createMusicControl();
    this.setupLifecycleListeners();

    if (this.shouldReuseAttackModeOnRetry && this.selectedAttackMode) {
      this.startWithAttackMode(this.selectedAttackMode);
    } else {
      this.showAttackModeSelection();
    }
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (!this.player || !this.cursors) return;

    if (this.isChoosingAttackMode) {
      this.handleAttackModeSelectionInput();
      return;
    }
    if (this.handleGameOverInput()) return;
    this.handlePauseInput();

    this.updatePlayerMovement(this.cursors);
    this.updateEnemies();

    this.handlePlayerAttackInput();

    this.updateHud();
    this.checkRoundComplete();

    if (this.isBackJustPressed()) {
      this.returnToHub();
    }
  }

  private updatePlayerMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  ) {
    let vx = 0;
    let vy = 0;
    const touchVector = virtualInput.getMoveVector();

    if (cursors.left?.isDown || virtualInput.isDirectionDown("left")) {
      vx = -1;
      this.player.setFlipX(true);
    } else if (cursors.right?.isDown || virtualInput.isDirectionDown("right")) {
      vx = 1;
      this.player.setFlipX(false);
    }

    if (cursors.up?.isDown || virtualInput.isDirectionDown("up")) {
      vy = -1;
    } else if (cursors.down?.isDown || virtualInput.isDirectionDown("down")) {
      vy = 1;
    }

    if (touchVector.x !== 0 || touchVector.y !== 0) {
      vx = touchVector.x;
      vy = touchVector.y;
    }

    if (vx !== 0 || vy !== 0) {
      this.facing.set(vx, vy).normalize();
    }

    this.player.setAngle(vx === 0 ? 0 : vx < 0 ? -3 : 3);
    if (touchVector.x < 0) this.player.setFlipX(true);
    if (touchVector.x > 0) this.player.setFlipX(false);

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);
  }

  private handleGameOverInput() {
    if (!this.isGameOver) return false;

    this.player.setVelocity(0, 0);
    const backPressed = this.isBackJustPressed();

    if (this.gameOverFlow?.checkingScore || this.gameOverFlow?.savingRecord) {
      return true;
    }

    if (this.gameOverFlow?.enteringName) {
      if (this.isMobileSaveJustPressed()) {
        void this.gameOverFlow.saveRecord(this.getGameOverStats());
      }
      if (backPressed) this.returnToHub();
      return true;
    }

    if (this.isRetryJustPressed()) {
      this.scene.restart({
        attackMode: this.attackMode,
      } satisfies CombatSceneData);
    }
    if (backPressed) this.returnToHub();
    return true;
  }

  private isRetryJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.retryKey) ||
      virtualInput.consumeAction("primary")
    );
  }

  private isMobileSaveJustPressed() {
    return virtualInput.consumeAction("primary");
  }

  private isBackJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      virtualInput.consumeAction("back")
    );
  }

  private consumeIgnoredPrimaryAction() {
    virtualInput.consumeAction("primary");
  }

  private resetCombatState() {
    this.round = INITIAL_ROUND;
    this.health = INITIAL_HEALTH;
    this.lastAttackAt = 0;
    this.lastDamageAt = 0;
    this.isChangingRound = false;
    this.isGameOver = false;
    this.kills = 0;
    this.scoreTracker.reset();
    this.finalScore = 0;
    this.finalSeconds = 0;
    this.gameOverFlow?.reset();
    this.isPauseMenuOpen = false;
    this.attackMode = this.selectedAttackMode ?? "auto";
    this.isChoosingAttackMode = false;
    this.attackModeOverlay = undefined;
    this.boss = undefined;
    this.bossHealth = 0;
    this.bossStunnedUntil = 0;
    this.bossPhaseTwoStarted = false;
    this.bossPhaseThreeStarted = false;
    this.bossInvulnerable = false;
    this.bossActionState = "chase";
    this.bossActionUntil = 0;
    this.nextBossChargeAt = 0;
    this.bossChargeDirection.set(0, 0);
    this.bossVisuals = undefined;
    this.healthPowerUpSlot = undefined;
    this.invulnerabilityPowerUpSlot = undefined;
    this.bossInvulnerabilityPowerUpTimer = undefined;
    this.playerPowerUpInvulnerability = undefined;
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
    this.wallsLayer = wallsLayer;

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
    this.player.body?.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, true);
    this.playerPowerUpInvulnerability = new PlayerPowerUpInvulnerability(
      this,
      this.player,
      {
        duration: INVULNERABILITY_POWER_UP_DURATION,
        blinkDuration: INVULNERABILITY_POWER_UP_BLINK_DURATION,
      },
    );

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.enemies, wallsLayer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      undefined,
      this,
    );
    this.createPowerUps(wallsLayer);
  }

  private createPowerUps(wallsLayer: Phaser.Tilemaps.TilemapLayer) {
    this.healthPowerUps = this.physics.add.group();
    this.invulnerabilityPowerUps = this.physics.add.group();
    this.healthPowerUpSlot = new GroundPowerUpSlot(this, {
      groundDuration: POWER_UP_GROUND_DURATION,
      blinkDuration: POWER_UP_GROUND_BLINK_DURATION,
    });
    this.invulnerabilityPowerUpSlot = new GroundPowerUpSlot(this, {
      groundDuration: POWER_UP_GROUND_DURATION,
      blinkDuration: POWER_UP_GROUND_BLINK_DURATION,
    });
    this.physics.add.collider(this.healthPowerUps, wallsLayer);
    this.physics.add.collider(this.invulnerabilityPowerUps, wallsLayer);
    this.physics.add.overlap(
      this.player,
      this.healthPowerUps,
      this.handleHealthPowerUpCollect,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.invulnerabilityPowerUps,
      this.handleInvulnerabilityPowerUpCollect,
      undefined,
      this,
    );
  }

  private setupInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    this.retryKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.pauseKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.P,
    );
  }

  private setupLifecycleListeners() {
    this.input.keyboard?.on("keydown", this.handleNameInput, this);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearHealthPowerUp();
      this.clearInvulnerabilityPowerUp();
      this.stopBossInvulnerabilityPowerUpAttempts();
      this.playerPowerUpInvulnerability?.stop();
      this.musicControl?.destroy();
      this.musicControl = undefined;
      this.gameOverFlow?.destroy();
      this.gameOverFlow = undefined;
      this.events.off(
        "combat:resume-from-pause",
        this.resumeFromPauseMenu,
        this,
      );
      this.input.keyboard?.off("keydown", this.handleNameInput, this);
      window.removeEventListener("blur", this.handleWindowBlur);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    });
    this.events.on("combat:resume-from-pause", this.resumeFromPauseMenu, this);
  }

  private setupStaticTexts() {
    const staticTexts = createStaticTexts(this, HUD_CONFIG);
    this.attackHintText = staticTexts.attackHintText;
  }

  private createMusicControl() {
    this.musicControl = createMusicControl(this, COMBAT_AUDIO.music, {
      x: ARENA_WIDTH - 4,
      y: 2,
      origin: [1, 0],
      scrollFactor: 0,
      depth: 20,
      canToggle: () => !this.gameOverFlow?.enteringName,
      style: {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { x: 4, y: 2 },
      },
    });
  }

  private setupHudTexts() {
    const hudTexts = createHudTexts(this, HUD_CONFIG);
    this.roundText = hudTexts.roundText;
    this.healthHearts = hudTexts.healthHearts;
    this.enemiesText = hudTexts.enemiesText;
    this.scoreText = hudTexts.scoreText;
  }

  private setupOverlayTexts() {
    const overlayTexts = createOverlayTexts(this, HUD_CONFIG);
    this.messageText = overlayTexts.messageText;
    this.gameOverFlow = new CombatGameOverFlow(
      this,
      overlayTexts,
      MAX_NAME_LENGTH,
    );
  }

  private showAttackModeSelection() {
    this.isChoosingAttackMode = true;
    this.player.setVelocity(0, 0);
    this.setCombatHudVisible(false);
    this.attackHintText.setVisible(false);
    this.attackModeOverlay = createAttackModeSelection(
      this,
      {
        arenaWidth: ARENA_WIDTH,
        arenaHeight: ARENA_HEIGHT,
        titleFont: TITLE_FONT,
      },
      {
        onAuto: () => this.selectAttackMode("auto"),
        onManual: () => this.selectAttackMode("manual"),
      },
    );
  }

  private handleAttackModeSelectionInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.retryKey) ||
      virtualInput.consumeAction("back")
    ) {
      this.selectAttackMode("auto");
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors!.space) ||
      virtualInput.consumeAction("primary")
    ) {
      this.selectAttackMode("manual");
    }
  }

  private selectAttackMode(mode: AttackMode) {
    this.startWithAttackMode(mode);
  }

  private startWithAttackMode(mode: AttackMode) {
    this.attackMode = mode;
    this.selectedAttackMode = undefined;
    this.isChoosingAttackMode = false;
    this.attackModeOverlay?.destroy(true);
    this.attackModeOverlay = undefined;
    virtualInput.clearActions();
    this.scoreTracker.startActive();
    this.setCombatHudVisible(true);
    this.attackHintText.setText(this.getAttackHint()).setVisible(true);
    this.startRound();
  }

  private getAttackHint() {
    return this.attackMode === "manual"
      ? getManualAttackHubHint()
      : getAttackHubHint();
  }

  private startRound() {
    this.isChangingRound = false;
    this.scoreTracker.startRound(this.isBossRound(), this.scene.isPaused());
    this.messageText.setVisible(false);
    if (this.isBossRound()) {
      this.spawnBoss();
    } else {
      this.spawnEnemies(this.round + 1);
    }
    this.updateHud();
  }

  private isBossRound() {
    return this.round === BOSS_CONFIG.round;
  }

  private spawnEnemies(count: number) {
    for (let i = 0; i < count; i += 1) {
      const point = getEnemySpawnPoint(i, count, ARENA_BOUNDS);
      const enemy = this.enemies.create(
        point.x,
        point.y,
        getEnemyTextureKey(i),
      ) as Phaser.Physics.Arcade.Sprite;

      enemy.setCollideWorldBounds(true);
      enemy.setScale(1);
    }
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
    this.updateBoss();
  }

  private spawnBoss() {
    const point = getBossSpawnPoint(ARENA_BOUNDS);
    this.boss = this.physics.add
      .sprite(point.x, point.y, BOSS_CONFIG.textureKey, BOSS_CONFIG.idleFrame)
      .setScale(BOSS_CONFIG.scale)
      .setDepth(3);
    this.boss.setCollideWorldBounds(true);
    this.boss.body?.setSize(
      BOSS_CONFIG.bodyWidth,
      BOSS_CONFIG.bodyHeight,
      true,
    );
    this.bossHealth = BOSS_CONFIG.health;
    this.bossActionState = "chase";
    this.bossActionUntil = 0;
    this.nextBossChargeAt = this.time.now + BOSS_CONFIG.chargeInterval;
    this.bossPhaseTwoStarted = false;
    this.bossPhaseThreeStarted = false;
    this.bossInvulnerable = false;
    this.bossVisuals = new BossVisuals(this, ARENA_WIDTH, ARENA_BOUNDS);

    this.physics.add.collider(this.boss, this.wallsLayer);
    this.drawBossHealthBar();
  }

  private updateBoss() {
    if (!this.boss?.active) return;
    this.updateBossInvulnerableAuraPosition();
    this.handleBossPlayerHit();
    this.separatePlayerFromBoss();
    if (this.bossActionState === "exploding") return;
    if (this.time.now < this.bossStunnedUntil) return;

    if (this.bossPhaseTwoStarted) {
      this.updateBossChargePattern();
      return;
    }

    this.chasePlayerWithBoss(BOSS_CONFIG.speed);
  }

  private updateBossChargePattern() {
    if (!this.boss?.active) return;

    if (this.bossActionState === "windup") {
      if (this.time.now >= this.bossActionUntil) this.startBossCharge();
      return;
    }

    if (this.bossActionState === "charge") {
      if (this.time.now >= this.bossActionUntil) this.startBossRecovery();
      return;
    }

    if (this.bossActionState === "recover") {
      if (this.time.now >= this.bossActionUntil) {
        this.bossActionState = "chase";
        this.nextBossChargeAt = this.time.now + BOSS_CONFIG.chargeInterval;
        this.boss.clearTint();
      }
      return;
    }

    if (this.time.now >= this.nextBossChargeAt) {
      this.startBossWindup();
      return;
    }

    this.chasePlayerWithBoss(BOSS_CONFIG.speed);
  }

  private chasePlayerWithBoss(speed: number) {
    if (!this.boss?.active) return;

    this.physics.moveToObject(this.boss, this.player, speed);
    this.boss.setFlipX(this.boss.body!.velocity.x < 0);
  }

  private startBossWindup() {
    if (!this.boss?.active) return;

    this.boss.setVelocity(0, 0);
    this.boss.setTint(BOSS_CONFIG.windupTint);
    this.bossChargeDirection.set(
      this.player.x - this.boss.x,
      this.player.y - this.boss.y,
    );
    if (this.bossChargeDirection.lengthSq() === 0) {
      this.bossChargeDirection.copy(this.facing);
    }
    this.bossChargeDirection.normalize();
    this.bossActionState = "windup";
    this.bossActionUntil = this.time.now + BOSS_CONFIG.chargeWindupDuration;
  }

  private startBossCharge() {
    if (!this.boss?.active) return;

    this.boss.clearTint();
    this.boss.setVelocity(
      this.bossChargeDirection.x * BOSS_CONFIG.chargeSpeed,
      this.bossChargeDirection.y * BOSS_CONFIG.chargeSpeed,
    );
    this.boss.setFlipX(this.bossChargeDirection.x < 0);
    this.bossActionState = "charge";
    this.bossActionUntil = this.time.now + BOSS_CONFIG.chargeDuration;
  }

  private startBossRecovery() {
    if (!this.boss?.active) return;

    this.boss.setVelocity(0, 0);
    this.boss.setTint(BOSS_CONFIG.recoveryTint);
    this.bossActionState = "recover";
    this.bossActionUntil = this.time.now + BOSS_CONFIG.chargeRecoveryDuration;
  }

  private handlePlayerAttackInput() {
    if (this.attackMode === "manual") {
      if (this.isManualAttackJustPressed()) this.tryPlayerAttack();
      return;
    }

    this.consumeIgnoredPrimaryAction();
    this.tryPlayerAttack();
  }

  private isManualAttackJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors!.space) ||
      virtualInput.consumeAction("primary")
    );
  }

  private tryPlayerAttack() {
    if (this.time.now - this.lastAttackAt < ATTACK_COOLDOWN) return;

    this.lastAttackAt = this.time.now;
    this.playCombatSound(COMBAT_AUDIO.attack);
    const attackCenter = this.getAttackCenter();
    const slash = createSlashEffect(
      this,
      this.player.x,
      this.player.y,
      this.facing,
    );

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

    this.hitBossIfInRange(attackCenter);

    this.updateHud();
  }

  private hitBossIfInRange(attackCenter: { x: number; y: number }) {
    if (!this.boss?.active) return;
    if (this.bossInvulnerable) return;

    if (!this.isBossInAttackRange(attackCenter)) return;

    this.bossHealth -= 1;
    const isChargeCommitted =
      this.bossActionState === "windup" || this.bossActionState === "charge";
    if (!isChargeCommitted) {
      this.knockBossBack();
    }
    this.boss.setTint(BOSS_CONFIG.hitTint);
    this.time.delayedCall(90, () => {
      if (!this.boss?.active) return;
      if (!this.bossInvulnerable) this.boss.clearTint();
    });

    if (this.bossHealth <= 0) {
      this.defeatBoss();
    } else {
      this.applyBossHitTransition();
      this.drawBossHealthBar();
    }
  }

  private applyBossHitTransition() {
    const transition = getBossHitTransition({
      health: this.bossHealth,
      phaseTwoStarted: this.bossPhaseTwoStarted,
      phaseThreeStarted: this.bossPhaseThreeStarted,
    });

    if (transition === "phase-two") {
      this.startBossPhaseTwo();
      return;
    }

    if (transition === "phase-three") {
      this.startBossPhaseThree();
      return;
    }

    if (transition === "explosion") {
      this.startBossExplosionSequence();
    }
  }

  private isBossInAttackRange(attackCenter: { x: number; y: number }) {
    if (!this.boss?.active) return false;

    return isBossInAttackRange(attackCenter, this.boss);
  }

  private startBossPhaseTwo() {
    if (!this.boss?.active) return;

    this.bossPhaseTwoStarted = true;
    this.startBossInvulnerabilityPowerUpAttempts();
    this.trySpawnInvulnerabilityPowerUp(1);
    this.bossActionState = "recover";
    this.bossActionUntil = this.time.now + BOSS_CONFIG.chargeRecoveryDuration;
    this.nextBossChargeAt = this.time.now + BOSS_CONFIG.chargeInterval;
    this.boss.setTint(BOSS_CONFIG.phaseTint);
    this.cameras.main.shake(
      BOSS_CONFIG.phaseShakeDuration,
      BOSS_CONFIG.phaseShakeIntensity,
    );
    this.messageText.setText("BOSS ENRAGED").setVisible(true);

    this.time.delayedCall(BOSS_CONFIG.phaseMessageDuration, () => {
      if (this.isGameOver || !this.boss?.active) return;
      this.messageText.setVisible(false);
      if (this.bossActionState === "recover")
        this.boss.setTint(BOSS_CONFIG.recoveryTint);
    });
  }

  private startBossPhaseThree() {
    if (!this.boss?.active) return;

    this.bossPhaseThreeStarted = true;
    this.cameras.main.shake(
      BOSS_CONFIG.phaseShakeDuration,
      BOSS_CONFIG.phaseShakeIntensity,
    );
    this.startBossExplosionSequence();
  }

  private startBossExplosionSequence() {
    if (!this.boss?.active || this.bossInvulnerable) return;

    this.bossInvulnerable = true;
    this.bossActionState = "exploding";
    this.boss.setVelocity(0, 0);
    this.boss.setTint(BOSS_CONFIG.explosionTint);
    this.startBossInvulnerableFeedback();
    this.messageText.setText("GET TO THE EDGE").setVisible(true);

    this.tweens.add({
      targets: this.boss,
      x: BOSS_CENTER_X,
      y: BOSS_CENTER_Y,
      duration: BOSS_CONFIG.explosionMoveDuration,
      ease: "Sine.easeInOut",
      onComplete: () => this.startBossExplosionWindup(),
    });
  }

  private startBossExplosionWindup() {
    if (!this.boss?.active || this.isGameOver) return;

    const warning = this.getBossExplosionWarning();
    if (!warning) return;
    warning.setVisible(true);
    this.drawBossExplosionWarning(0.24);

    this.tweens.add({
      targets: warning,
      alpha: 0.95,
      duration: BOSS_CONFIG.explosionWindupDuration,
      yoyo: true,
      onComplete: () => this.releaseBossExplosion(),
    });
  }

  private releaseBossExplosion() {
    if (!this.boss?.active || this.isGameOver) return;

    this.drawBossExplosionWarning(0.72);
    this.cameras.main.shake(
      PLAYER_HIT_SHAKE_DURATION,
      PLAYER_HIT_SHAKE_INTENSITY,
    );

    if (this.isPlayerInsideBossExplosion()) {
      this.damagePlayer({ allowDuringBossInvulnerability: true });
    }

    this.time.delayedCall(BOSS_CONFIG.explosionRecoveryDuration, () => {
      if (!this.boss?.active || this.isGameOver) return;
      this.clearBossExplosionWarning();
      this.messageText.setVisible(false);
      this.bossInvulnerable = false;
      this.stopBossInvulnerableFeedback();
      this.bossActionState = "chase";
      this.nextBossChargeAt = this.time.now + BOSS_CONFIG.chargeInterval;
      this.boss.clearTint();
    });
  }

  private getBossExplosionWarning() {
    return this.bossVisuals?.getExplosionWarning();
  }

  private startBossInvulnerableFeedback() {
    if (!this.boss?.active) return;

    this.bossVisuals?.startInvulnerabilityFeedback(this.boss);
  }

  private updateBossInvulnerableAuraPosition() {
    this.bossVisuals?.updateInvulnerabilityAuraPosition(this.boss);
  }

  private stopBossInvulnerableFeedback() {
    this.bossVisuals?.stopInvulnerabilityFeedback(this.boss);
  }

  private drawBossExplosionWarning(alpha: number) {
    const danger = this.getBossExplosionDangerBounds();
    this.bossVisuals?.drawExplosionWarning(danger, alpha);
  }

  private getBossExplosionDangerBounds() {
    return getBossExplosionDangerBounds(ARENA_BOUNDS);
  }

  private isPlayerInsideBossExplosion() {
    return isPointInsideBounds(
      this.player,
      this.getBossExplosionDangerBounds(),
    );
  }

  private knockBossBack() {
    if (!this.boss?.active) return;

    const knockback = getBossKnockbackVector(
      this.boss,
      this.player,
      this.facing,
    );
    this.bossStunnedUntil = this.time.now + BOSS_CONFIG.hitStunDuration;
    this.bossActionState = "recover";
    this.bossActionUntil = this.time.now + BOSS_CONFIG.hitStunDuration;
    this.boss.setVelocity(knockback.x, knockback.y);

    this.time.delayedCall(BOSS_CONFIG.hitStunDuration, () => {
      if (!this.boss?.active || this.time.now < this.bossStunnedUntil) return;
      this.boss.setVelocity(0, 0);
    });
  }

  private defeatBoss() {
    if (!this.boss?.active) return;

    this.kills += 1;
    this.stopBossInvulnerabilityPowerUpAttempts();
    this.boss.disableBody(false, false);
    this.boss.setTint(BOSS_CONFIG.defeatTint);
    this.boss.setDepth(ENEMY_DEFEAT_DEPTH);
    this.clearBossHealthBar();
    this.clearBossExplosionWarning();
    this.stopBossInvulnerableFeedback();

    const boss = this.boss;
    this.boss = undefined;
    this.tweens.add({
      targets: boss,
      alpha: 0,
      scale: BOSS_CONFIG.scale * ENEMY_DEFEAT_SCALE,
      duration: ENEMY_DEFEAT_DURATION,
      onComplete: () => boss.destroy(),
    });
  }

  private handlePlayerHit = () => {
    this.damagePlayer();
  };

  private damagePlayer({
    allowDuringBossInvulnerability = false,
  }: { allowDuringBossInvulnerability?: boolean } = {}) {
    if (this.isGameOver) return;
    if (this.playerPowerUpInvulnerability?.isActive()) return;
    if (this.bossInvulnerable && !allowDuringBossInvulnerability) return;
    if (this.time.now - this.lastDamageAt < DAMAGE_COOLDOWN) return;

    this.lastDamageAt = this.time.now;
    this.health -= 1;
    this.playCombatSound(COMBAT_AUDIO.playerHit);
    this.cameras.main.shake(
      PLAYER_HIT_SHAKE_DURATION,
      PLAYER_HIT_SHAKE_INTENSITY,
    );
    this.startPlayerInvulnerabilityFeedback();

    if (this.health <= 0) {
      void this.endGame();
    }

    this.updateHud();
  }

  private handleBossPlayerHit = () => {
    if (!this.boss?.active) return;

    if (!isBossContactDamagingPlayer(this.player, this.boss)) return;
    this.handlePlayerHit();
  };

  private separatePlayerFromBoss() {
    if (!this.boss?.active) return;
    if (this.bossInvulnerable || this.bossActionState === "exploding") return;

    const separation = getBossPlayerSeparationVector(this.player, this.boss);
    if (separation.lengthSq() === 0) return;

    this.player.x = Phaser.Math.Clamp(
      this.player.x + separation.x,
      ARENA_BOUNDS.x,
      ARENA_BOUNDS.x + ARENA_BOUNDS.width,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + separation.y,
      ARENA_BOUNDS.y,
      ARENA_BOUNDS.y + ARENA_BOUNDS.height,
    );
  }

  private playCombatSound(soundConfig: { key: string; volume: number }) {
    if (!this.cache.audio.exists(soundConfig.key)) return;
    this.sound.play(soundConfig.key, { volume: soundConfig.volume });
  }

  private getAttackCenter() {
    return {
      x: this.player.x + this.facing.x * ATTACK_CENTER_OFFSET,
      y: this.player.y + this.facing.y * ATTACK_CENTER_OFFSET,
    };
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!enemy.active) return;

    this.kills += 1;
    enemy.disableBody(false, false);
    playEnemyDefeatEffect(this, enemy, this.player, this.facing);
    this.trySpawnHealthPowerUp();
    this.trySpawnInvulnerabilityPowerUp(INVULNERABILITY_POWER_UP_DROP_CHANCE);
  }

  private trySpawnHealthPowerUp() {
    if (this.health >= INITIAL_HEALTH) return;
    if (this.healthPowerUpSlot?.isActive()) return;
    if (Phaser.Math.FloatBetween(0, 1) > HEALTH_POWER_UP_DROP_CHANCE) return;

    const point = getHealthPowerUpSpawnPoint({
      bounds: new Phaser.Geom.Rectangle(
        ARENA_BOUNDS.x,
        ARENA_BOUNDS.y,
        ARENA_BOUNDS.width,
        ARENA_BOUNDS.height,
      ),
      player: this.player,
      enemies: this.getActiveEnemies(),
    });

    this.healthPowerUpSlot?.spawn(
      createHealthPowerUp(this, this.healthPowerUps, point),
    );
  }

  private trySpawnInvulnerabilityPowerUp(dropChance: number) {
    if (this.playerPowerUpInvulnerability?.isActive()) return;
    if (this.invulnerabilityPowerUpSlot?.isActive()) return;
    if (!this.canSpawnInvulnerabilityPowerUp()) return;
    if (Phaser.Math.FloatBetween(0, 1) > dropChance) return;

    const point = getInvulnerabilityPowerUpSpawnPoint({
      bounds: new Phaser.Geom.Rectangle(
        ARENA_BOUNDS.x,
        ARENA_BOUNDS.y,
        ARENA_BOUNDS.width,
        ARENA_BOUNDS.height,
      ),
      player: this.player,
      enemies: this.getActiveEnemies(),
    });

    this.invulnerabilityPowerUpSlot?.spawn(
      createInvulnerabilityPowerUp(this, this.invulnerabilityPowerUps, point),
    );
  }

  private canSpawnInvulnerabilityPowerUp() {
    if (this.isBossRound()) return this.bossPhaseTwoStarted;
    return this.round >= INVULNERABILITY_POWER_UP_MIN_ROUND;
  }

  private handleHealthPowerUpCollect = (
    _player: ArcadeOverlapObject,
    powerUp: ArcadeOverlapObject,
  ) => {
    if (!this.healthPowerUpSlot?.matches(powerUp)) return;

    this.healPlayer(HEALTH_POWER_UP_HEAL);
    this.clearHealthPowerUp();
  };

  private healPlayer(amount: number) {
    this.health = Math.min(INITIAL_HEALTH, this.health + amount);
    this.updateHud();
  }

  private handleInvulnerabilityPowerUpCollect = (
    _player: ArcadeOverlapObject,
    powerUp: ArcadeOverlapObject,
  ) => {
    if (!this.invulnerabilityPowerUpSlot?.matches(powerUp)) return;

    this.stopPlayerHitFeedback();
    this.playerPowerUpInvulnerability?.start();
    this.clearInvulnerabilityPowerUp();
  };

  private clearHealthPowerUp() {
    this.healthPowerUpSlot?.clear();
  }

  private clearInvulnerabilityPowerUp() {
    this.invulnerabilityPowerUpSlot?.clear();
  }

  private startBossInvulnerabilityPowerUpAttempts() {
    this.stopBossInvulnerabilityPowerUpAttempts();
    this.bossInvulnerabilityPowerUpTimer = this.time.addEvent({
      delay: BOSS_INVULNERABILITY_POWER_UP_ATTEMPT_INTERVAL,
      loop: true,
      callback: () =>
        this.trySpawnInvulnerabilityPowerUp(
          BOSS_INVULNERABILITY_POWER_UP_DROP_CHANCE,
        ),
    });
  }

  private stopBossInvulnerabilityPowerUpAttempts() {
    this.bossInvulnerabilityPowerUpTimer?.remove(false);
    this.bossInvulnerabilityPowerUpTimer = undefined;
  }

  private startPlayerInvulnerabilityFeedback() {
    this.stopPlayerHitFeedback();
    this.player.setTint(PLAYER_HIT_TINT);

    this.playerHitFeedbackTween = this.tweens.add({
      targets: this.player,
      alpha: PLAYER_HIT_BLINK_ALPHA,
      duration: PLAYER_HIT_BLINK_DURATION,
      yoyo: true,
      repeat: PLAYER_HIT_BLINK_REPEATS,
      onComplete: () => {
        this.playerHitFeedbackTween = undefined;
        if (!this.player.active) return;
        this.player.setAlpha(1);
        if (this.playerPowerUpInvulnerability?.isActive()) return;
        this.player.clearTint();
      },
    });
  }

  private stopPlayerHitFeedback() {
    this.playerHitFeedbackTween?.stop();
    this.playerHitFeedbackTween = undefined;

    if (!this.player.active) return;
    this.player.setAlpha(1);
  }

  private checkRoundComplete() {
    if (
      this.isChangingRound ||
      this.enemies.countActive(true) > 0 ||
      this.isBossAlive()
    ) {
      return;
    }

    this.isChangingRound = true;
    this.scoreTracker.completeRound(this.scene.isPaused());
    this.round += 1;
    this.messageText.setText(`ROUND ${this.round}`).setVisible(true);

    this.time.delayedCall(ROUND_START_DELAY, () => {
      if (!this.isGameOver) this.startRound();
    });
  }

  private async endGame() {
    this.finalSeconds = this.getSurvivedSeconds();
    this.finalScore = this.calculateScore();
    this.isGameOver = true;
    this.health = 0;
    this.attackHintText.setVisible(false);
    this.setCombatHudVisible(false);
    this.player.setVisible(false);
    this.player.disableBody(false, false);
    this.clearBossHealthBar();
    this.clearBossExplosionWarning();
    this.stopBossInvulnerableFeedback();
    this.clearHealthPowerUp();
    this.clearInvulnerabilityPowerUp();
    this.stopBossInvulnerabilityPowerUpAttempts();
    this.playerPowerUpInvulnerability?.stop();
    if (this.boss?.active) {
      this.boss.setVelocity(0, 0);
      this.boss.disableBody(true, true);
    }
    this.getActiveEnemies().forEach((enemy) => {
      enemy.setVelocity(0, 0);
      enemy.disableBody(true, true);
    });

    await this.gameOverFlow?.checkScoreAndShowPrompt(this.getGameOverStats());
  }

  private updateHud() {
    this.roundText.setText(`ROUND: ${this.round}`);
    updateHealthHearts(this.healthHearts, this.health);
    this.enemiesText.setText(
      this.isBossAlive()
        ? "BOSS"
        : `ENEMIES: ${this.enemies.countActive(true)}`,
    );
    this.scoreText.setText(`SCORE: ${this.calculateScore()}`);
    this.drawBossHealthBar();
  }

  private setCombatHudVisible(isVisible: boolean) {
    this.roundText.setVisible(isVisible);
    this.healthHearts.forEach((heart) => heart.setVisible(isVisible));
    this.enemiesText.setVisible(isVisible);
    this.scoreText.setVisible(isVisible);
    this.bossVisuals?.setHudVisible(isVisible && this.isBossAlive());
  }

  private isBossAlive() {
    return Boolean(this.boss?.active);
  }

  private drawBossHealthBar() {
    if (!this.isBossAlive()) {
      this.clearBossHealthBar();
      return;
    }

    this.bossVisuals?.drawHealthBar(this.bossHealth, {
      x: BOSS_BAR_X,
      y: BOSS_BAR_Y,
    });
  }

  private clearBossHealthBar() {
    this.bossVisuals?.clearHealthBar();
  }

  private clearBossExplosionWarning() {
    this.bossVisuals?.clearExplosionWarning();
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
    this.musicControl?.stop();
    this.selectedAttackMode = undefined;
    this.shouldReuseAttackModeOnRetry = false;
    virtualInput.clearActions();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start("HubScene", { spawn: "arena" });
      },
    );
  }

  private calculateScore() {
    return this.scoreTracker.calculateScore({
      kills: this.kills,
      round: this.round,
      isChangingRound: this.isChangingRound,
      isPaused: this.scene.isPaused(),
    });
  }

  private getGameOverStats(): CombatGameOverStats {
    return {
      score: this.finalScore,
      round: this.round,
      kills: this.kills,
      seconds: this.finalSeconds,
    };
  }

  private getSurvivedSeconds() {
    return this.scoreTracker.getSurvivedSeconds({
      isGameOver: this.isGameOver,
      finalSeconds: this.finalSeconds,
      isPaused: this.scene.isPaused(),
    });
  }

  private pauseCombatTimer() {
    if (this.isChoosingAttackMode || this.isGameOver || this.scene.isPaused())
      return;

    this.freezeCombatForPause();
    this.scene.pause();
  }

  private resumeCombatTimer() {
    if (
      this.isChoosingAttackMode ||
      this.isGameOver ||
      this.isPauseMenuOpen ||
      !this.scene.isPaused()
    )
      return;

    this.scoreTracker.startActive();
    this.scene.resume();
  }

  private handlePauseInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.pauseKey) ||
      virtualInput.consumeAction("pause")
    ) {
      this.openPauseMenu();
    }
  }

  private openPauseMenu() {
    if (
      this.isChoosingAttackMode ||
      this.isGameOver ||
      this.gameOverFlow?.enteringName ||
      this.isPauseMenuOpen ||
      this.scene.isPaused()
    ) {
      return;
    }

    this.isPauseMenuOpen = true;
    this.freezeCombatForPause();
    this.scene.launch("CombatPauseScene");
    this.scene.pause();
  }

  private resumeFromPauseMenu() {
    if (!this.isPauseMenuOpen) return;

    this.isPauseMenuOpen = false;
    this.scoreTracker.startActive();
    this.scene.resume();
  }

  private freezeCombatForPause() {
    this.scoreTracker.freeze();
    this.player?.setVelocity(0, 0);
    this.boss?.setVelocity(0, 0);
    this.getActiveEnemies().forEach((enemy) => enemy.setVelocity(0, 0));
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
    this.gameOverFlow?.handleNameInput(event, this.getGameOverStats());
  }
}

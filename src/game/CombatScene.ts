import Phaser from "phaser";
import {
  createHudTexts,
  createOverlayTexts,
  createStaticTexts,
  updateHealthHearts,
} from "./combat/hud";
import { getAttackHubHint, getManualAttackHubHint } from "./input/inputMode";
import { virtualInput } from "./input/virtualInput";
import { createMusicControl } from "./ui/musicControl";
import {
  createAttackModeSelection,
  type AttackMode,
  type CombatSceneData,
} from "./combat/attackMode";
import {
  CombatGameOverFlow,
  type CombatGameOverStats,
} from "./combat/gameOverFlow";
import {
  getBossSpawnPoint,
  getEnemySpawnPoint,
  getEnemyTextureKey,
} from "./combat/enemySpawning";
import {
  createHealthPowerUp,
  getHealthPowerUpSpawnPoint,
  type HealthPowerUp,
} from "./combat/healthPowerUp";
import {
  createInvulnerabilityPowerUp,
  getInvulnerabilityPowerUpSpawnPoint,
  type InvulnerabilityPowerUp,
} from "./combat/invulnerabilityPowerUp";
import {
  ENEMY_DEFEAT_DEPTH,
  ENEMY_DEFEAT_DURATION,
  ENEMY_DEFEAT_SCALE,
  playEnemyDefeatEffect,
} from "./combat/enemyUi";
import {
  createSlashEffect,
  SLASH_FADE_DURATION,
  SLASH_FADE_SCALE,
} from "./combat/playerAttackUi";
import { BOSS_CONFIG, type BossActionState } from "./combat/bossConfig";
import {
  getBossExplosionDangerBounds,
  getBossHitTransition,
  getBossKnockbackVector,
  getBossPlayerSeparationVector,
  isBossContactDamagingPlayer,
  isBossInAttackRange,
  isPointInsideBounds,
} from "./combat/bossLogic";
import {
  clearBossExplosionWarning,
  clearBossHud,
  createBossExplosionWarning,
  createBossHud,
  drawBossExplosionWarning,
  drawBossHealthBar,
  setBossHudVisible,
  startBossInvulnerabilityFeedback,
  stopBossInvulnerabilityFeedback,
  updateBossInvulnerabilityAuraPosition,
  type BossHud,
} from "./combat/bossUi";

const ARENA_WIDTH = 320;
const ARENA_HEIGHT = 160;
const SPEED = 95;
const ENEMY_SPEED = 22;
const BOSS_CENTER_X = ARENA_WIDTH / 2;
const BOSS_CENTER_Y = ARENA_HEIGHT / 2;
const BOSS_BAR_X = ARENA_WIDTH / 2 - BOSS_CONFIG.barWidth / 2;
const BOSS_BAR_Y = 16;
const ATTACK_RANGE = 34;
const ATTACK_COOLDOWN = 700;
const DAMAGE_COOLDOWN = 900;
const MAX_NAME_LENGTH = 10;
const UI_FONT = "11px";
const TITLE_FONT = "12px";
const INITIAL_ROUND = 1;
const INITIAL_HEALTH = 6;
const PLAYER_START_Y_OFFSET = 18;
const PLAYER_BODY_WIDTH = 14;
const PLAYER_BODY_HEIGHT = 14;
const ENEMY_SPEED_PER_ROUND = 0.5;
const ATTACK_CENTER_OFFSET = 14;
const ATTACK_HIT_PADDING = 8;
const PLAYER_HIT_SHAKE_DURATION = 90;
const PLAYER_HIT_SHAKE_INTENSITY = 0.008;
const PLAYER_HIT_TINT = 0xff6b6b;
const PLAYER_HIT_BLINK_ALPHA = 0.35;
const PLAYER_HIT_BLINK_DURATION = 80;
const PLAYER_HIT_BLINK_REPEATS = 5;
const ROUND_START_DELAY = 900;
const POWER_UP_GROUND_DURATION = 6000;
const POWER_UP_GROUND_BLINK_DURATION = 3000;
const HEALTH_POWER_UP_HEAL = 2;
const HEALTH_POWER_UP_DROP_CHANCE = 0.15;
const INVULNERABILITY_POWER_UP_DROP_CHANCE = 0.17;
const INVULNERABILITY_POWER_UP_MIN_ROUND = 3;
const INVULNERABILITY_POWER_UP_DURATION = 4000;
const INVULNERABILITY_POWER_UP_BLINK_DURATION = 1000;
const BOSS_INVULNERABILITY_POWER_UP_ATTEMPT_INTERVAL = 5000;
const BOSS_INVULNERABILITY_POWER_UP_DROP_CHANCE = 0.5;
const KILL_SCORE = 100;
const ROUND_SCORE = 250;
const SECOND_SCORE = 5;
const MAX_TIME_SCORE_SECONDS_PER_ROUND = 15;
const MAX_TIME_SCORE_SECONDS_BOSS_ROUND = 25;
const ARENA_BOUNDS = {
  x: 12,
  y: 16,
  width: ARENA_WIDTH - 24,
  height: ARENA_HEIGHT - 28,
};
const HUD_CONFIG = {
  arenaWidth: ARENA_WIDTH,
  arenaHeight: ARENA_HEIGHT,
  titleFont: TITLE_FONT,
  uiFont: UI_FONT,
};
const COMBAT_AUDIO = {
  music: {
    key: "combatSceneMusic",
    path: "assets/audio/combatScene_theme.ogg",
    volume: 0.12,
  },
  attack: {
    key: "combatSwordSound",
    path: "assets/audio/sword.ogg",
    volume: 0.05,
  },
  playerHit: {
    key: "combatPlayerHitSound",
    path: "assets/audio/hit.ogg",
    volume: 0.5,
  },
};

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
  private bossHud?: BossHud;
  private bossExplosionWarning?: Phaser.GameObjects.Graphics;
  private bossInvulnerableAura?: Phaser.GameObjects.Graphics;
  private bossInvulnerableBlink?: Phaser.Tweens.Tween;
  private healthPowerUp?: HealthPowerUp;
  private healthPowerUpBlink?: Phaser.Tweens.Tween;
  private healthPowerUpBlinkTimer?: Phaser.Time.TimerEvent;
  private healthPowerUpExpireTimer?: Phaser.Time.TimerEvent;
  private invulnerabilityPowerUp?: InvulnerabilityPowerUp;
  private invulnerabilityPowerUpBlink?: Phaser.Tweens.Tween;
  private invulnerabilityPowerUpBlinkTimer?: Phaser.Time.TimerEvent;
  private invulnerabilityPowerUpExpireTimer?: Phaser.Time.TimerEvent;
  private bossInvulnerabilityPowerUpTimer?: Phaser.Time.TimerEvent;
  private isPlayerPowerUpInvulnerable = false;
  private playerPowerUpInvulnerabilityTimer?: Phaser.Time.TimerEvent;
  private playerPowerUpInvulnerabilityBlinkTimer?: Phaser.Time.TimerEvent;
  private playerPowerUpInvulnerabilityTween?: Phaser.Tweens.Tween;
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
  private activeStartedAt = 0;
  private activeElapsedMs = 0;
  private roundStartedElapsedMs = 0;
  private scoredSecondsFromCompletedRounds = 0;
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
    this.load.audio(COMBAT_AUDIO.music.key, COMBAT_AUDIO.music.path);
    this.load.audio(COMBAT_AUDIO.attack.key, COMBAT_AUDIO.attack.path);
    this.load.audio(COMBAT_AUDIO.playerHit.key, COMBAT_AUDIO.playerHit.path);
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
    this.activeStartedAt = Date.now();
    this.activeElapsedMs = 0;
    this.roundStartedElapsedMs = 0;
    this.scoredSecondsFromCompletedRounds = 0;
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
    this.bossHud = undefined;
    this.bossExplosionWarning = undefined;
    this.bossInvulnerableAura = undefined;
    this.bossInvulnerableBlink = undefined;
    this.healthPowerUp = undefined;
    this.healthPowerUpBlink = undefined;
    this.healthPowerUpBlinkTimer = undefined;
    this.healthPowerUpExpireTimer = undefined;
    this.invulnerabilityPowerUp = undefined;
    this.invulnerabilityPowerUpBlink = undefined;
    this.invulnerabilityPowerUpBlinkTimer = undefined;
    this.invulnerabilityPowerUpExpireTimer = undefined;
    this.bossInvulnerabilityPowerUpTimer = undefined;
    this.isPlayerPowerUpInvulnerable = false;
    this.playerPowerUpInvulnerabilityTimer = undefined;
    this.playerPowerUpInvulnerabilityBlinkTimer = undefined;
    this.playerPowerUpInvulnerabilityTween = undefined;
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
      this.stopPlayerPowerUpInvulnerability();
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
    this.activeStartedAt = Date.now();
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
    this.roundStartedElapsedMs = this.getActiveElapsedMs();
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
    if (!this.bossExplosionWarning) {
      this.bossExplosionWarning = createBossExplosionWarning(this);
    }

    return this.bossExplosionWarning;
  }

  private startBossInvulnerableFeedback() {
    if (!this.boss?.active) return;

    const feedback = startBossInvulnerabilityFeedback(
      this,
      this.boss,
      this.bossInvulnerableAura,
      this.bossInvulnerableBlink,
    );
    this.bossInvulnerableAura = feedback.aura;
    this.bossInvulnerableBlink = feedback.blink;
  }

  private updateBossInvulnerableAuraPosition() {
    updateBossInvulnerabilityAuraPosition(this.bossInvulnerableAura, this.boss);
  }

  private stopBossInvulnerableFeedback() {
    stopBossInvulnerabilityFeedback(
      {
        aura: this.bossInvulnerableAura,
        blink: this.bossInvulnerableBlink,
      },
      this.boss,
    );
    this.bossInvulnerableBlink = undefined;
  }

  private drawBossExplosionWarning(alpha: number) {
    const warning = this.getBossExplosionWarning();
    const danger = this.getBossExplosionDangerBounds();
    drawBossExplosionWarning(warning, danger, ARENA_BOUNDS, alpha);
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
    if (this.isPlayerPowerUpInvulnerable) return;
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
    if (this.healthPowerUp?.sprite.active) return;
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

    this.healthPowerUp = createHealthPowerUp(this, this.healthPowerUps, point);
    this.healthPowerUpBlinkTimer = this.time.delayedCall(
      POWER_UP_GROUND_DURATION - POWER_UP_GROUND_BLINK_DURATION,
      () => this.startHealthPowerUpBlink(),
    );
    this.healthPowerUpExpireTimer = this.time.delayedCall(
      POWER_UP_GROUND_DURATION,
      () => this.clearHealthPowerUp(),
    );
  }

  private trySpawnInvulnerabilityPowerUp(dropChance: number) {
    if (this.isPlayerPowerUpInvulnerable) return;
    if (this.invulnerabilityPowerUp?.sprite.active) return;
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

    this.invulnerabilityPowerUp = createInvulnerabilityPowerUp(
      this,
      this.invulnerabilityPowerUps,
      point,
    );
    this.invulnerabilityPowerUpBlinkTimer = this.time.delayedCall(
      POWER_UP_GROUND_DURATION - POWER_UP_GROUND_BLINK_DURATION,
      () => this.startInvulnerabilityPowerUpBlink(),
    );
    this.invulnerabilityPowerUpExpireTimer = this.time.delayedCall(
      POWER_UP_GROUND_DURATION,
      () => this.clearInvulnerabilityPowerUp(),
    );
  }

  private canSpawnInvulnerabilityPowerUp() {
    if (this.isBossRound()) return this.bossPhaseTwoStarted;
    return this.round >= INVULNERABILITY_POWER_UP_MIN_ROUND;
  }

  private startHealthPowerUpBlink() {
    if (!this.healthPowerUp?.sprite.active) return;

    this.healthPowerUpBlink = this.tweens.add({
      targets: this.healthPowerUp.sprite,
      alpha: 0.22,
      duration: 140,
      yoyo: true,
      repeat: -1,
    });
  }

  private startInvulnerabilityPowerUpBlink() {
    if (!this.invulnerabilityPowerUp?.sprite.active) return;

    this.invulnerabilityPowerUpBlink = this.tweens.add({
      targets: this.invulnerabilityPowerUp.sprite,
      alpha: 0.22,
      duration: 140,
      yoyo: true,
      repeat: -1,
    });
  }

  private handleHealthPowerUpCollect = (
    _player: ArcadeOverlapObject,
    powerUp: ArcadeOverlapObject,
  ) => {
    if (powerUp !== this.healthPowerUp?.sprite) return;

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
    if (powerUp !== this.invulnerabilityPowerUp?.sprite) return;

    this.startPlayerPowerUpInvulnerability();
    this.clearInvulnerabilityPowerUp();
  };

  private startPlayerPowerUpInvulnerability() {
    this.stopPlayerPowerUpInvulnerability();
    this.isPlayerPowerUpInvulnerable = true;
    this.player.setTint(0x7dd3fc);

    this.playerPowerUpInvulnerabilityTimer = this.time.delayedCall(
      INVULNERABILITY_POWER_UP_DURATION,
      () => this.stopPlayerPowerUpInvulnerability(),
    );
    this.playerPowerUpInvulnerabilityBlinkTimer = this.time.delayedCall(
      INVULNERABILITY_POWER_UP_DURATION -
        INVULNERABILITY_POWER_UP_BLINK_DURATION,
      () => this.startPlayerPowerUpInvulnerabilityBlink(),
    );
  }

  private startPlayerPowerUpInvulnerabilityBlink() {
    if (!this.isPlayerPowerUpInvulnerable || !this.player.active) return;

    this.playerPowerUpInvulnerabilityTween = this.tweens.add({
      targets: this.player,
      alpha: 0.45,
      duration: 90,
      yoyo: true,
      repeat: -1,
    });
  }

  private stopPlayerPowerUpInvulnerability() {
    this.playerPowerUpInvulnerabilityTimer?.remove(false);
    this.playerPowerUpInvulnerabilityBlinkTimer?.remove(false);
    this.playerPowerUpInvulnerabilityTween?.stop();
    this.playerPowerUpInvulnerabilityTimer = undefined;
    this.playerPowerUpInvulnerabilityBlinkTimer = undefined;
    this.playerPowerUpInvulnerabilityTween = undefined;
    this.isPlayerPowerUpInvulnerable = false;

    if (!this.player?.active) return;
    this.player.setAlpha(1);
    this.player.clearTint();
  }

  private clearHealthPowerUp() {
    this.healthPowerUpBlinkTimer?.remove(false);
    this.healthPowerUpExpireTimer?.remove(false);
    this.healthPowerUpBlink?.stop();
    this.healthPowerUp?.pulseTween.stop();
    this.healthPowerUp?.sprite.destroy();
    this.healthPowerUpBlinkTimer = undefined;
    this.healthPowerUpExpireTimer = undefined;
    this.healthPowerUpBlink = undefined;
    this.healthPowerUp = undefined;
  }

  private clearInvulnerabilityPowerUp() {
    this.invulnerabilityPowerUpBlinkTimer?.remove(false);
    this.invulnerabilityPowerUpExpireTimer?.remove(false);
    this.invulnerabilityPowerUpBlink?.stop();
    this.invulnerabilityPowerUp?.pulseTween.stop();
    this.invulnerabilityPowerUp?.sprite.destroy();
    this.invulnerabilityPowerUpBlinkTimer = undefined;
    this.invulnerabilityPowerUpExpireTimer = undefined;
    this.invulnerabilityPowerUpBlink = undefined;
    this.invulnerabilityPowerUp = undefined;
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
    if (
      this.isChangingRound ||
      this.enemies.countActive(true) > 0 ||
      this.isBossAlive()
    ) {
      return;
    }

    this.isChangingRound = true;
    this.scoredSecondsFromCompletedRounds += this.getCurrentRoundScoreSeconds();
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
    this.stopPlayerPowerUpInvulnerability();
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
    setBossHudVisible(this.bossHud, isVisible && this.isBossAlive());
  }

  private isBossAlive() {
    return Boolean(this.boss?.active);
  }

  private drawBossHealthBar() {
    if (!this.isBossAlive()) {
      this.clearBossHealthBar();
      return;
    }

    this.bossHud ??= createBossHud(this, ARENA_WIDTH);
    drawBossHealthBar(this.bossHud, this.bossHealth, {
      x: BOSS_BAR_X,
      y: BOSS_BAR_Y,
    });
  }

  private clearBossHealthBar() {
    clearBossHud(this.bossHud);
  }

  private clearBossExplosionWarning() {
    clearBossExplosionWarning(this.bossExplosionWarning);
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
    return (
      this.kills * KILL_SCORE +
      this.round * ROUND_SCORE +
      this.getScoredSeconds() * SECOND_SCORE
    );
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
    if (this.isGameOver) return this.finalSeconds;
    return Math.floor(this.getActiveElapsedMs() / 1000);
  }

  private getScoredSeconds() {
    if (this.isChangingRound) return this.scoredSecondsFromCompletedRounds;

    return (
      this.scoredSecondsFromCompletedRounds + this.getCurrentRoundScoreSeconds()
    );
  }

  private getCurrentRoundScoreSeconds() {
    const roundElapsedSeconds = Math.floor(
      (this.getActiveElapsedMs() - this.roundStartedElapsedMs) / 1000,
    );

    return Math.min(roundElapsedSeconds, this.getMaxTimeScoreSecondsForRound());
  }

  private getMaxTimeScoreSecondsForRound() {
    return this.isBossRound()
      ? MAX_TIME_SCORE_SECONDS_BOSS_ROUND
      : MAX_TIME_SCORE_SECONDS_PER_ROUND;
  }

  private getActiveElapsedMs() {
    if (this.isGameOver) return this.finalSeconds * 1000;
    if (this.scene.isPaused()) return this.activeElapsedMs;
    return this.activeElapsedMs + Date.now() - this.activeStartedAt;
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

    this.activeStartedAt = Date.now();
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
    this.activeStartedAt = Date.now();
    this.scene.resume();
  }

  private freezeCombatForPause() {
    this.activeElapsedMs += Date.now() - this.activeStartedAt;
    this.activeStartedAt = Date.now();
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

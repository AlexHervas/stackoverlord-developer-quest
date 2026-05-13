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
  loadRanking,
  saveRankingEntry,
} from "./combat/ranking";
import { eventBus } from "./events/events";
import {
  getAttackHubHint,
  getManualAttackHubHint,
  getNameSubmitHint,
  getRetryHubHint,
} from "./input/inputMode";
import { virtualInput } from "./input/virtualInput";
import { createMusicControl } from "./ui/musicControl";
import {
  createAttackModeSelection,
  type AttackMode,
  type CombatSceneData,
} from "./combat/attackMode";
import { BOSS_CONFIG, type BossActionState } from "./combat/bossConfig";
import {
  getBossExplosionDangerBounds,
  getBossKnockbackVector,
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
import type { RankingEntry, SpawnPoint } from "./combat/types";

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
const INITIAL_HEALTH = 3;
const PLAYER_START_Y_OFFSET = 18;
const PLAYER_BODY_WIDTH = 14;
const PLAYER_BODY_HEIGHT = 14;
const ENEMY_SPAWN_MARGIN = 16;
const ENEMY_SPAWN_JITTER = 6;
const ENEMY_SPEED_PER_ROUND = 1;
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

export default class CombatScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
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
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey!: Phaser.Input.Keyboard.Key;
  private retryKey!: Phaser.Input.Keyboard.Key;

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
  private isEnteringName = false;
  private isCheckingScore = false;
  private isSavingRecord = false;
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
  private statsText!: Phaser.GameObjects.Text;
  private nameInputText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private attackHintText!: Phaser.GameObjects.Text;
  private musicControl?: ReturnType<typeof createMusicControl>;
  private removeNameInputReadyListener?: () => void;
  private removeNameInputChangeListener?: () => void;
  private removeNameInputSubmitListener?: () => void;
  private isHtmlNameInputReady = false;

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
    const retryPressed = this.isRetryJustPressed();
    const savePressed = this.isMobileSaveJustPressed();
    const backPressed = this.isBackJustPressed();

    if (this.isCheckingScore || this.isSavingRecord) return true;

    if (!this.isEnteringName && retryPressed) {
      this.scene.restart({
        attackMode: this.attackMode,
      } satisfies CombatSceneData);
    }
    if (this.isEnteringName && savePressed) {
      void this.saveRecord();
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
    this.isEnteringName = false;
    this.isCheckingScore = false;
    this.isSavingRecord = false;
    this.kills = 0;
    this.activeStartedAt = Date.now();
    this.activeElapsedMs = 0;
    this.finalScore = 0;
    this.finalSeconds = 0;
    this.nameDraft = "";
    this.isHtmlNameInputReady = false;
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
    this.retryKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
  }

  private setupLifecycleListeners() {
    this.input.keyboard?.on("keydown", this.handleNameInput, this);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.musicControl?.destroy();
      this.musicControl = undefined;
      this.closeNameInput();
      this.input.keyboard?.off("keydown", this.handleNameInput, this);
      window.removeEventListener("blur", this.handleWindowBlur);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    });
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
      canToggle: () => !this.isEnteringName,
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
    this.healthText = hudTexts.healthText;
    this.enemiesText = hudTexts.enemiesText;
    this.scoreText = hudTexts.scoreText;
  }

  private setupOverlayTexts() {
    const overlayTexts = createOverlayTexts(this, HUD_CONFIG);
    this.messageText = overlayTexts.messageText;
    this.rankingText = overlayTexts.rankingText;
    this.statsText = overlayTexts.statsText;
    this.nameInputText = overlayTexts.nameInputText;
    this.controlsText = overlayTexts.controlsText;
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
    if (Phaser.Input.Keyboard.JustDown(this.retryKey)) {
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
      x: base.x + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
      y: base.y + Phaser.Math.Between(-ENEMY_SPAWN_JITTER, ENEMY_SPAWN_JITTER),
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
    this.updateBoss();
  }

  private spawnBoss() {
    const point = this.getSpawnPoint(1);
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
      if (
        !this.bossPhaseTwoStarted &&
        this.bossHealth <= BOSS_CONFIG.phaseTwoHealth
      ) {
        this.startBossPhaseTwo();
      }
      if (
        !this.bossPhaseThreeStarted &&
        this.bossHealth <= BOSS_CONFIG.phaseThreeHealth
      ) {
        this.startBossPhaseThree();
      } else if (this.bossPhaseThreeStarted) {
        this.startBossExplosionSequence();
      }
      this.drawBossHealthBar();
    }
  }

  private isBossInAttackRange(attackCenter: { x: number; y: number }) {
    if (!this.boss?.active) return false;

    return isBossInAttackRange(attackCenter, this.boss);
  }

  private startBossPhaseTwo() {
    if (!this.boss?.active) return;

    this.bossPhaseTwoStarted = true;
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
    if (
      this.isChangingRound ||
      this.enemies.countActive(true) > 0 ||
      this.isBossAlive()
    ) {
      return;
    }

    this.isChangingRound = true;
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
    if (this.boss?.active) {
      this.boss.setVelocity(0, 0);
      this.boss.disableBody(true, true);
    }
    this.getActiveEnemies().forEach((enemy) => {
      enemy.setVelocity(0, 0);
      enemy.disableBody(true, true);
    });

    this.messageText.setText("CHECKING SCORE...").setVisible(true);
    this.isCheckingScore = true;
    const playerId = getPlayerId();
    const bestScore = await getBestScore(playerId);
    this.isCheckingScore = false;
    if (!this.scene.isActive()) return;

    if (!bestScore.hasBestScore || this.finalScore > bestScore.score) {
      this.isEnteringName = true;
      this.messageText
        .setText(`NEW RECORD: ${this.finalScore}`)
        .setVisible(true);
      this.showNameEntryPrompt();
      this.updateNameInput();
    } else {
      this.messageText
        .setText(`YOU FELL. SCORE: ${this.finalScore}`)
        .setVisible(true);
      void this.showRanking(getRetryHubHint());
    }
  }

  private updateHud() {
    this.roundText.setText(`ROUND: ${this.round}`);
    this.healthText.setText(`HEALTH: ${this.health}`);
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
    this.healthText.setVisible(isVisible);
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
    if (this.isChoosingAttackMode || this.isGameOver || this.scene.isPaused())
      return;

    this.activeElapsedMs += Date.now() - this.activeStartedAt;
    this.player?.setVelocity(0, 0);
    this.getActiveEnemies().forEach((enemy) => enemy.setVelocity(0, 0));
    this.scene.pause();
  }

  private resumeCombatTimer() {
    if (this.isChoosingAttackMode || this.isGameOver || !this.scene.isPaused())
      return;

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
    if (this.isSavingRecord) return;

    if (event.key === "Enter") {
      void this.saveRecord();
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
    this.nameInputText
      .setText(`NAME: ${visibleName}`)
      .setVisible(!this.isHtmlNameInputReady);
  }

  private showNameEntryPrompt() {
    this.rankingText.setVisible(false);
    this.statsText.setVisible(false);
    this.openNameInput();
    this.controlsText.setText(getNameSubmitHint()).setVisible(true);
  }

  private openNameInput() {
    this.closeNameInput();
    eventBus.emit("combat:name-input:open", {
      value: this.nameDraft,
      maxLength: MAX_NAME_LENGTH,
    });
    this.removeNameInputReadyListener = eventBus.on(
      "combat:name-input:ready",
      () => {
        if (!this.isEnteringName) return;
        this.isHtmlNameInputReady = true;
        this.nameInputText.setVisible(false);
      },
    );
    this.removeNameInputChangeListener = eventBus.on(
      "combat:name-input:change",
      ({ value }) => {
        if (!this.isEnteringName || this.isSavingRecord) return;
        this.nameDraft = value.slice(0, MAX_NAME_LENGTH);
        this.updateNameInput();
      },
    );
    this.removeNameInputSubmitListener = eventBus.on(
      "combat:name-input:submit",
      () => {
        if (!this.isEnteringName || this.isSavingRecord) return;
        void this.saveRecord();
      },
    );
  }

  private closeNameInput() {
    this.removeNameInputReadyListener?.();
    this.removeNameInputChangeListener?.();
    this.removeNameInputSubmitListener?.();
    this.removeNameInputReadyListener = undefined;
    this.removeNameInputChangeListener = undefined;
    this.removeNameInputSubmitListener = undefined;
    this.isHtmlNameInputReady = false;
    eventBus.emit("combat:name-input:close", undefined);
  }

  private async saveRecord() {
    this.isSavingRecord = true;
    const entry: RankingEntry = {
      playerId: getPlayerId(),
      name: this.nameDraft.trim() || "ANON",
      score: this.finalScore,
      round: this.round,
      kills: this.kills,
      seconds: this.finalSeconds,
      date: new Date().toISOString(),
    };

    this.controlsText.setText("SAVING...");
    await saveRankingEntry(entry);
    if (!this.scene.isActive()) return;

    this.isSavingRecord = false;
    this.isEnteringName = false;
    this.closeNameInput();
    this.nameInputText.setVisible(false);
    this.messageText.setText(`SAVED: ${entry.name} ${entry.score}`);
    await this.showRanking(getRetryHubHint());
  }

  private async showRanking(footer: string) {
    const ranking = await loadRanking();
    if (!this.scene.isActive()) return;
    const rows = this.formatRankingColumns(formatRankingRows(ranking));

    this.messageText.setY(48);
    this.rankingText.setText(["TOP 10 ARENA", ...rows]).setVisible(true);
    this.statsText
      .setText(
        `KILLS: ${this.kills}  ROUND: ${this.round}  TIME: ${this.finalSeconds}S`,
      )
      .setVisible(true);
    this.controlsText.setText(footer).setVisible(true);
  }

  private formatRankingColumns(rows: string[]) {
    const normalizedRows = rows.slice(0, 10);
    const leftRows = normalizedRows.slice(0, 5);
    const rightRows = normalizedRows.slice(5, 10);
    const leftWidth = Math.max(...leftRows.map((row) => row.length), 16);

    return leftRows.map((leftRow, index) => {
      const rightRow = rightRows[index];
      return rightRow
        ? `${leftRow.padEnd(leftWidth, " ")}  ${rightRow}`
        : leftRow;
    });
  }
}

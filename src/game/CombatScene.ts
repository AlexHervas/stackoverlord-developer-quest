import Phaser from "phaser";

const ARENA_WIDTH = 320;
const ARENA_HEIGHT = 160;
const SPEED = 95;
const ENEMY_SPEED = 34;
const ATTACK_RANGE = 30;
const ATTACK_COOLDOWN = 320;
const DAMAGE_COOLDOWN = 900;
const MAX_NAME_LENGTH = 10;
const RANKING_KEY = "portfolioCombatRanking";
const BEST_SCORE_KEY = "portfolioCombatBestScore";
const PLAYER_ID_KEY = "portfolioCombatPlayerId";
const UI_FONT = "11px";
const TITLE_FONT = "12px";
const ARENA_BOUNDS = {
  x: 12,
  y: 24,
  width: ARENA_WIDTH - 24,
  height: ARENA_HEIGHT - 36,
};

type RankingEntry = {
  playerId?: string;
  name: string;
  score: number;
  round: number;
  kills: number;
  seconds: number;
  date: string;
};

export default class CombatScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private retryKey!: Phaser.Input.Keyboard.Key;

  private round = 1;
  private health = 3;
  private lastAttackAt = 0;
  private lastDamageAt = 0;
  private isChangingRound = false;
  private isGameOver = false;
  private isEnteringName = false;
  private kills = 0;
  private startedAt = 0;
  private finalScore = 0;
  private finalSeconds = 0;
  private nameDraft = "";

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
    this.load.image("playerSprite", "assets/player.png");
    this.load.image("wizard", "assets/wizard.png");
  }

  create() {
    this.round = 1;
    this.health = 3;
    this.lastAttackAt = 0;
    this.lastDamageAt = 0;
    this.isChangingRound = false;
    this.isGameOver = false;
    this.isEnteringName = false;
    this.kills = 0;
    this.startedAt = this.time.now;
    this.finalScore = 0;
    this.finalSeconds = 0;
    this.nameDraft = "";

    this.physics.world.setBounds(
      ARENA_BOUNDS.x,
      ARENA_BOUNDS.y,
      ARENA_BOUNDS.width,
      ARENA_BOUNDS.height,
    );

    const cam = this.cameras.main;
    cam.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    cam.roundPixels = true;
    cam.centerOn(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    this.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH,
      ARENA_HEIGHT,
      0x22150f,
    );
    this.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2 + 10,
      ARENA_WIDTH - 24,
      ARENA_HEIGHT - 48,
      0x6f3f1e,
    );
    this.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2 + 10,
      ARENA_WIDTH - 34,
      ARENA_HEIGHT - 58,
      0xb36a2e,
    );

    this.add
      .text(8, 6, "ARENA", {
        fontFamily: "monospace",
        fontSize: TITLE_FONT,
        color: "#ffe7a2",
      })
      .setScrollFactor(0);

    this.add
      .text(ARENA_WIDTH / 2, 8, "RONDA 1", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.45)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.add
      .text(ARENA_WIDTH - 8, 6, "ESP:ATK ESC:HUB", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#05F521",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.player = this.physics.add
      .sprite(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 18, "playerSprite")
      .setScale(1);
    this.player.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      undefined,
      this,
    );

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

    this.roundText = this.add
      .text(8, ARENA_HEIGHT - 34, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.45)",
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0);

    this.healthText = this.add
      .text(8, ARENA_HEIGHT - 18, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.45)",
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0);

    this.enemiesText = this.add
      .text(ARENA_WIDTH - 8, ARENA_HEIGHT - 18, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.45)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.scoreText = this.add
      .text(ARENA_WIDTH - 8, ARENA_HEIGHT - 34, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffe7a2",
        backgroundColor: "rgba(0,0,0,0.45)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.messageText = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 42, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(20);

    this.rankingText = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 18, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#fff4bf",
        backgroundColor: "rgba(0,0,0,0.82)",
        padding: { x: 7, y: 5 },
        align: "left",
      })
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(20);

    this.nameInputText = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 45, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#ffffff",
        backgroundColor: "rgba(79,45,22,0.85)",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(20);

    this.controlsText = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT - 8, "", {
        fontFamily: "monospace",
        fontSize: UI_FONT,
        color: "#05F521",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(20);

    this.input.keyboard?.on("keydown", this.handleNameInput, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleNameInput, this);
    });

    this.startRound();
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (!this.player || !this.cursors) return;

    if (this.isGameOver) {
      this.player.setVelocity(0, 0);
      if (
        !this.isEnteringName &&
        Phaser.Input.Keyboard.JustDown(this.retryKey)
      ) {
        this.scene.restart();
      }
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.returnToHub();
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left?.isDown) {
      vx = -1;
      this.player.setFlipX(true);
    } else if (this.cursors.right?.isDown) {
      vx = 1;
      this.player.setFlipX(false);
    }

    if (this.cursors.up?.isDown) vy = -1;
    else if (this.cursors.down?.isDown) vy = 1;

    this.player.setAngle(vx === 0 ? 0 : vx < 0 ? -3 : 3);

    const velocity = new Phaser.Math.Vector2(vx, vy);
    if (velocity.lengthSq() > 0) velocity.normalize().scale(SPEED);
    this.player.setVelocity(velocity.x, velocity.y);

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
        "wizard",
      ) as Phaser.Physics.Arcade.Sprite;

      enemy.setCollideWorldBounds(true);
      enemy.setScale(1);
      enemy.setTint(0xffb3b3);
    }
  }

  private getSpawnPoint(index: number) {
    const positions = [
      { x: ARENA_BOUNDS.x + 16, y: ARENA_BOUNDS.y + 16 },
      { x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - 16, y: ARENA_BOUNDS.y + 16 },
      { x: ARENA_BOUNDS.x + 16, y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - 16 },
      {
        x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - 16,
        y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - 16,
      },
    ];

    const base = positions[index % positions.length];
    return {
      x: base.x + Phaser.Math.Between(-6, 6),
      y: base.y + Phaser.Math.Between(-6, 6),
    };
  }

  private updateEnemies() {
    this.getActiveEnemies().forEach((enemy) => {
      this.physics.moveToObject(
        enemy,
        this.player,
        ENEMY_SPEED + this.round * 3,
      );
      enemy.setFlipX(enemy.body!.velocity.x < 0);
    });
  }

  private attack() {
    if (this.time.now - this.lastAttackAt < ATTACK_COOLDOWN) return;

    this.lastAttackAt = this.time.now;
    const slash = this.add.circle(
      this.player.x,
      this.player.y,
      ATTACK_RANGE,
      0xffe7a2,
      0.18,
    );
    slash.setStrokeStyle(2, 0xffffff, 0.65);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.25,
      duration: 160,
      onComplete: () => slash.destroy(),
    });

    this.getActiveEnemies().forEach((enemy) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );

      if (distance <= ATTACK_RANGE) {
        this.kills += 1;
        enemy.destroy();
      }
    });

    this.updateHud();
  }

  private handlePlayerHit = () => {
    if (this.isGameOver) return;
    if (this.time.now - this.lastDamageAt < DAMAGE_COOLDOWN) return;

    this.lastDamageAt = this.time.now;
    this.health -= 1;
    this.cameras.main.shake(90, 0.008);
    this.player.setTint(0xff6b6b);

    this.time.delayedCall(160, () => {
      if (this.player.active) this.player.clearTint();
    });

    if (this.health <= 0) {
      this.endGame();
    }

    this.updateHud();
  };

  private checkRoundComplete() {
    if (this.isChangingRound || this.enemies.countActive(true) > 0) return;

    this.isChangingRound = true;
    this.round += 1;
    this.messageText.setText(`RONDA ${this.round}`).setVisible(true);

    this.time.delayedCall(900, () => {
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

    const bestScore = this.getBestScore();
    const hasBestScore = window.localStorage.getItem(BEST_SCORE_KEY) !== null;

    if (!hasBestScore || this.finalScore > bestScore) {
      this.isEnteringName = true;
      this.messageText
        .setText(`NUEVO RECORD: ${this.finalScore}`)
        .setVisible(true);
      this.showRanking("ESCRIBE NOMBRE + ENTER");
      this.updateNameInput();
    } else {
      this.messageText
        .setText(`HAS CAIDO. SCORE: ${this.finalScore}`)
        .setVisible(true);
      this.showRanking("E: REINTENTAR | ESC: HUB");
    }
  }

  private updateHud() {
    this.roundText.setText(`RONDA: ${this.round}`);
    this.healthText.setText(`VIDA: ${this.health}`);
    this.enemiesText.setText(`ENEMIGOS: ${this.enemies.countActive(true)}`);
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
        this.scene.start("HubScene");
      },
    );
  }

  private calculateScore() {
    return this.kills * 100 + this.round * 250 + this.getSurvivedSeconds() * 5;
  }

  private getSurvivedSeconds() {
    if (this.isGameOver) return this.finalSeconds;
    return Math.floor((this.time.now - this.startedAt) / 1000);
  }

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
    this.nameInputText.setText(`NOMBRE: ${visibleName}`).setVisible(true);
    this.controlsText.setText("ENTER: GUARDAR | ESC: HUB").setVisible(true);
  }

  private saveRecord() {
    const entry: RankingEntry = {
      playerId: this.getPlayerId(),
      name: this.nameDraft.trim() || "ANON",
      score: this.finalScore,
      round: this.round,
      kills: this.kills,
      seconds: this.finalSeconds,
      date: new Date().toISOString(),
    };

    const ranking = [
      ...this.loadRanking().filter((record) => {
        return record.playerId !== entry.playerId;
      }),
      entry,
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    window.localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
    window.localStorage.setItem(BEST_SCORE_KEY, String(this.finalScore));

    this.isEnteringName = false;
    this.nameInputText.setVisible(false);
    this.messageText.setText(`GUARDADO: ${entry.name} ${entry.score}`);
    this.showRanking("E: REINTENTAR | ESC: HUB");
  }

  private showRanking(footer: string) {
    const ranking = this.loadRanking();
    const rows =
      ranking.length > 0
        ? ranking.map((entry, index) => {
            const position = String(index + 1).padStart(2, "0");
            return `${position} ${entry.name.padEnd(10, " ")} ${entry.score}`;
          })
        : ["SIN RECORDS TODAVIA"];

    this.rankingText
      .setText([
        "TOP 10 ARENA",
        ...rows,
        "",
        `KILLS: ${this.kills}  RONDA: ${this.round}  TIEMPO: ${this.finalSeconds}S`,
      ])
      .setVisible(true);
    this.controlsText.setText(footer).setVisible(true);
  }

  private loadRanking(): RankingEntry[] {
    const rawRanking = window.localStorage.getItem(RANKING_KEY);
    if (!rawRanking) return [];

    try {
      const ranking = JSON.parse(rawRanking) as RankingEntry[];
      if (!Array.isArray(ranking)) return [];
      return ranking
        .filter((entry) => {
          return (
            typeof entry.name === "string" &&
            typeof entry.score === "number" &&
            typeof entry.round === "number" &&
            typeof entry.kills === "number" &&
            typeof entry.seconds === "number" &&
            typeof entry.date === "string"
          );
        })
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  private getBestScore() {
    return Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
  }

  private getPlayerId() {
    const currentId = window.localStorage.getItem(PLAYER_ID_KEY);
    if (currentId) return currentId;

    const newId = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, newId);
    return newId;
  }
}

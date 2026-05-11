import type Phaser from "phaser";

export type RankingEntry = {
  playerId?: string;
  name: string;
  score: number;
  round: number;
  kills: number;
  seconds: number;
  date: string;
};

export type SpawnPoint = {
  x: number;
  y: number;
};

export type CombatHudConfig = {
  arenaWidth: number;
  arenaHeight: number;
  titleFont: string;
  uiFont: string;
};

export type CombatHudTexts = {
  roundText: Phaser.GameObjects.Text;
  healthText: Phaser.GameObjects.Text;
  enemiesText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
};

export type CombatStaticTexts = {
  attackHintText: Phaser.GameObjects.Text;
};

export type CombatOverlayTexts = {
  messageText: Phaser.GameObjects.Text;
  rankingText: Phaser.GameObjects.Text;
  statsText: Phaser.GameObjects.Text;
  nameInputText: Phaser.GameObjects.Text;
  controlsText: Phaser.GameObjects.Text;
};
